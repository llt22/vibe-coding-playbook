# t3dotgg/tstack

- 结论：**值得一试**。先把 tstack 装到单个低风险仓库，只用 file-pr 和 babysit-pr 跑两三个真实 PR，暂不给自动合并权限；因为 README 给出了可直接复制的安装命令、技能依赖图和明确的前置条件，但技能本体内容不在材料里，效果没有数据支撑。
- 原文：https://github.com/t3dotgg/tstack
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-24T23:57:03.470Z

## 是什么

tstack 是 t3dotgg（Theo）把自己每天在 Claude Code 和 Codex 上使用的 agent skills 整理成的公开仓库（MIT，约 32 stars）。共 9 个技能，围绕「把一个改动一路推进成合并的 PR」这一条链路组织：

| 技能 | 口头触发 | 作用（原文表述归纳） |
|---|---|---|
| `full-send` | "full send" | 无人值守把一个改动推到 merged PR：证明、评审、提 PR、盯 PR、合并 |
| `full-stop` | "full stop" | 同 `full-send`，但到「可合并」就停，由人来点合并 |
| `council` | "council" | 让来自三个不同 provider 的模型评审，循环到它们意见一致 |
| `sol-loop` | "sol loop" | 用 GPT Sol 循环评审，直到两个 agent 达成一致 |
| `file-pr` | "file a PR" | 提一个简短的 PR，开头先讲问题，而不是罗列改动清单 |
| `takeover` | "take over" | 接手别人的 PR、分支或 agent 线程，并保留原作者的署名 |
| `babysit-pr` | "babysit" | 盯 PR 的 CI 和 review bot，只修真正的问题 |
| `modernize` | "modernize" | 给老 PR rebase，并判断它是否还该存在 |
| `leaving-pr-comments` | 自动 | 格式化 agent 代你发布的 PR 评论 |

设计上有两点值得注意：技能之间显式复用（见下），以及与 harness 解耦——「有 T3 Code 特性时就用，没有就退回原生工具」。

## 具体做法

1. **前置条件**（原文 Requirements）：
   - 安装并完成认证的 GitHub CLI：`gh auth login`（技能要靠 `gh` 操作 PR）。
   - `python3`，因为 `babysit-pr` 的 `pr-wait` 脚本需要它。
   - 若要用 `council` / `sol-loop`，需要一个能调用其他厂商模型 subagent 的 harness。T3 Code 用 `delegate_task` 实现；其他 harness 必须自己能跑这些模型，否则这两个技能不可用。

2. **安装到两个 harness 的 skills 目录**（原文命令，原样可复制）：

```bash
git clone https://github.com/t3dotgg/tstack
cp -R tstack/skills/* ~/.claude/skills/   # Claude Code
cp -R tstack/skills/* ~/.codex/skills/    # Codex
```

3. **按依赖关系补齐技能**（原文明确给出，缺一个会调用失败）：
   - `full-send` 依赖 `sol-loop`、`file-pr`、`babysit-pr`
   - `full-stop` 依赖 `full-send`
   - `takeover` 依赖 `modernize`、`file-pr`、`babysit-pr`、`leaving-pr-comments`
   - `file-pr`、`babysit-pr`、`modernize` 依赖 `leaving-pr-comments`

   即：想用 `full-stop`，至少要装 `full-send` + `sol-loop` + `file-pr` + `babysit-pr` + `leaving-pr-comments`。

4. **不直接改技能本体，把个人配置写进 `CLAUDE.md` / `AGENTS.md`**。原文建议：技能只是起点，应当修改；但像「哪几个模型组成 council」这类个人设置要放进 `CLAUDE.md` 或 `AGENTS.md`，这样更新技能时不会把配置覆盖掉。这一步是整份 README 里最通用的工程做法。

5. **保守起步：先 `full-stop`，不要 `full-send`**。两者流程相同，差别只在终点——`full-send` 是「没人看着」直接合并，`full-stop` 停在「你来合并」。在有完整 CI 和 review bot 兜底之前，先用后者。

6. **触发方式**：安装后在对话里直接说触发词（如 "full send" / "babysit" / "file a PR"），`leaving-pr-comments` 无需口头触发。

## 对应的研究问题

**1. 能力发现（AI 还能接哪些没想到的活）**
- 把「提 PR → 盯 CI → 处理 review 意见 → 合并」这条尾巴整体交出去，而不是只让 AI 写代码。
- `takeover`：接手别人留下的 PR、分支甚至别人的 agent 线程，并保留原作者署名——这是很少被想到的协作型任务。
- `modernize`：对旧 PR 做 rebase，并判断「它是否还该存在」（即替人做废弃决策）。
- `leaving-pr-comments`：把「以你的名义在 PR 上发言」这件事本身当作可自动化的格式任务。

**2. 任务匹配（什么活配什么模型/工具/协作方式）**
- 按任务环节拆成窄技能：写 PR 描述（`file-pr`）、盯 CI（`babysit-pr`）、多模型对抗评审（`council` / `sol-loop`），而不是一个万能 agent。
- 评审质量靠「跨 provider 异构模型」而不是单模型自审：`council` 用三个不同厂商的模型循环到一致，`sol-loop` 用两方循环到一致。
- 模型选择被显式做成配置项（放进 `CLAUDE.md`/`AGENTS.md`），说明作者把「哪个模型干什么」当作可调参数而非硬编码。

**3. 条件供给（要提供哪些信息、工具、权限、反馈）**
- 工具：`gh` CLI + 认证、`python3`、能跑外部模型的 subagent harness。
- 权限：必然需要仓库的 push / PR / merge 权限（`full-send` 的合并动作隐含这一点）。
- 反馈回路：CI 结果与 review bot 的评论是 `babysit-pr` 的输入信号，原文强调「只修真正的问题」（fix the real findings），即需要区分真实发现与噪声。
- 上下文：项目级约定写在 `CLAUDE.md`/`AGENTS.md`，作为跨技能共享的持久上下文。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- `babysit-pr` 是典型的**状态/事件驱动**：持续监视 PR 的 CI 与 review bot，出现新结果就处理。
- `full-send` 是**目标驱动、无人值守**：从改动一路推进到 merged，中途不需要人。
- `council` / `sol-loop` 是**收敛循环**：反复评审直到多方一致，属于「以一致为终止条件」的自主循环。

**5. 效果验证**
- 原文**没有给出任何验证指标或数据**。只能从流程设计反推可观测的终点：CI 是否通过、多方评审是否达成一致、PR 是否走到可合并/已合并。具体如何度量改善，需要自己补（见末节）。

## 与已有做法的关系

清单中有 **Claude Code**（tool，adopt）和 **Agent skills**（concept，adopt）。tstack 正好是这两者的具体实例：一组可直接 `cp` 进 `~/.claude/skills/`（以及 `~/.codex/skills/`）的现成 skill 集合，可作为「agent skills 该怎么组织」的参考实现——尤其是**技能间显式依赖图**和**把个人配置外置到 `CLAUDE.md`/`AGENTS.md`** 这两点，能直接补进手册里关于 Agent skills 的条目。清单中没有与 "T3 Code" 相关的条目（原文提到它作为可选依赖）。

## 证据与局限

- **只拿到 README**：技能本体（提示词、脚本、`pr-wait` 实现）不在材料中，因此无法核验它到底怎么拆解任务、怎么配置、质量如何。本报告对「怎么做」的描述均来自 README 的功能表与依赖关系，不是技能内部实现。
- **无任何量化数据或案例**：没有 benchmark、没有 PR 数量、没有合并成功率。「每天在用」是作者自述，属于主张而非证据。
- **规模信号弱**：约 32 stars，个人工作流仓库，成熟度未经外部检验，接口和文件随时可能变。
- **强依赖特定生态**：部分技能依赖 T3 Code 的 `delegate_task`；没有等价 harness 时 `council` / `sol-loop` 不可用。
- **`full-send` 风险明确**：原文自述是「没人看着」直接合并。适用条件至少应包括：有能拦住的 CI、有 review bot、改动可回滚、仓库不是生产关键路径。不具备这些条件时不应使用。
- **适用条件**：整套东西假设你的工作在 GitHub PR 流程里，且愿意把 PR 生命周期交给 agent。非 GitHub、非 PR 式协作的场景不适用。

## 怎么试、怎么验证

**第一步（最小试用，1 周）**：选一个低风险、有 CI 的仓库，按上面命令安装，但**只启用 `file-pr` 和 `babysit-pr`**（连带 `leaving-pr-comments`），`full-send`/`full-stop` 先不调用，合并权限仍由人掌握。跑 2–3 个真实 PR。

观察指标：
- `file-pr`：PR 描述首段是否真的先讲问题，而不是罗列改动（可直接人工判 yes/no）。
- `babysit-pr`：每个 PR 需要几轮修复才让 CI 变绿；它提交的修复里，被人工判定为「误报/噪声」的比例（对应原文「只修真实 findings」这一主张是否成立）。
- `leaving-pr-comments`：agent 代发的评论是否可直接发给同事，不需要改写。
- 人工总耗时与不用技能时相比是增是减。

**第二步（有限自主，2 周）**：加入 `full-stop`，仍保留人工点合并。核心指标是**人工干预次数/PR**——如果每个 PR 仍需你介入 3 次以上，说明技能在你的代码库里没有真正接住任务，不应升级到 `full-send`。

**第三步（谨慎验证 `full-send`）**：仅在「CI 能拦住问题 + 改动可回滚 + 非关键仓库」的范围内试 1–2 次，记录是否出现需要 revert 的合并。出现一次即回退到 `full-stop`。

**同时要做的一件事**：把 council 的模型组合、项目约定写进 `CLAUDE.md`/`AGENTS.md` 再开始试，否则后续更新技能会丢掉配置，导致前后结果不可比。
