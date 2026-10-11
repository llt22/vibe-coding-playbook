# multica-ai/andrej-karpathy-skills

- 结论：**建议采用**。直接在编码智能体项目里落一份 CLAUDE.md（或装 Claude Code 插件），把四条原则当成硬约束，并把命令式任务改写成带验证标准的目标；理由是原文给了可复制的安装命令、四条可照做的行为规则和一张任务改写对照表，属于拿到就能用的配置，而非泛泛观点。
- 原文：https://github.com/multica-ai/andrej-karpathy-skills
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T02:13:20.654Z

## 是什么

一个单文件 `CLAUDE.md` 行为约束，用于改善 Claude Code（以及 Cursor）在写代码时的行为。内容源自 Andrej Karpathy 对 LLM 编码常见毛病的观察，被提炼成四条原则：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution。仓库提供两种落地方式（Claude Code 插件、逐项目 CLAUDE.md），并自带一条 Cursor 项目规则 `.cursor/rules/karpathy-guidelines.mdc`（配置见 CURSOR.md）。MIT 许可。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：你至少有非琐碎的代码任务交给编码智能体（Claude Code 或 Cursor）。原文明确说明该指南偏向「谨慎优先于速度」，对琐碎任务（拼写修正、显而易见的一行改动）不必套全套流程。

1. **安装为 Claude Code 插件（原文推荐）**。在 Claude Code 内依次执行：

```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

前提：使用 Claude Code。安装后该 skill 在所有项目中可用。

2. **或写进项目级 CLAUDE.md**。新项目：

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
```

已有项目（追加，避免覆盖原有内容）：

```bash
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md >> CLAUDE.md
```

3. **与项目特定规则合并**（原文给的写法，追加到同一份 CLAUDE.md 里）：

```markdown
## Project-Specific Guidelines

- Use TypeScript strict mode
- All API endpoints must have tests
- Follow the existing error handling patterns in `src/utils/errors.ts`
```

4. **Cursor 用户**：使用仓库自带的 `.cursor/rules/karpathy-guidelines.mdc`，按 CURSOR.md 完成设置（含如何把该规则用到其他项目）。

5. **把四条原则当作对智能体的硬约束逐条落地**：
   - *Think Before Coding*：显式写出假设，不确定就问而不是猜；有歧义时列出多种解释而不是默默选一个；有更简单方案要反驳；卡住时点名不清楚的地方并请求澄清。
   - *Simplicity First*：不加没要求的功能；不为一次性代码做抽象；不做没被要求的「灵活性/可配置性」；不为不可能发生的场景写错误处理；200 行能写成 50 行就重写。自检：「资深工程师会不会说这过度复杂？」
   - *Surgical Changes*：不「顺手改善」相邻代码、注释或格式；不重构没坏的东西；沿用现有风格（即使你会写得不一样）；发现无关死代码只提不删；自己改动造成的孤儿（import/变量/函数）由自己清掉。自检：「每一行改动都能直接追溯到用户的请求」。
   - *Goal-Driven Execution*：把命令式任务改写成带验证的目标。

6. **用原文对照表改写任务**：

| Instead of... | Transform to... |
|--------------|-----------------|
| "Add validation" | "Write tests for invalid inputs, then make them pass" |
| "Fix the bug" | "Write a test that reproduces it, then make it pass" |
| "Refactor X" | "Ensure tests pass before and after" |

7. **多步任务先给带验证点的简短计划**：

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

原文强调：强成功标准能让 LLM 独立循环，弱标准（如「make it work」）会不断需要澄清。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文点名了智能体本来没想到要交出去、但实际该由它做的工作——歧义识别与多解释列举、取舍呈现、「更简单方案」的反驳、以及把模糊需求转写成可验证目标。这些是「先想后写」型的认知工作，不写进约束模型通常不会主动做。
- **任务匹配**：适合编码智能体在非琐碎代码修改任务上使用（Claude Code 为插件路径，Cursor 为 .mdc 规则路径）。原文的 tradeoff note 明确划出边界：琐碎任务（typo、obvious one-liner）不必用全流程，需自行判断。
- **条件供给**：需要提供的输入是——一份可被读取的 CLAUDE.md（或插件安装）、项目特定规则段、以及「成功标准/测试」这一可验证目标；需要给的许可包括「停下来提问」「提出更简单方案」「只做被请求的改动」；反馈来自测试通过与 diff 审查。
- **主动推进**：Goal-Driven Execution 是原文里唯一的持续执行机制——把指令改成声明式目标 + 验证循环后，让模型自行循环直到满足标准（原文引 Karpathy：不要告诉它做什么，给它成功标准然后看它跑）。原文没有提到时间/事件触发器式的调度。
- **效果验证**：原文「How to Know It's Working」给出四条可观察信号（见下节）。这是明确的验证指标，虽然只是定性描述。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中已有 `andrej-karpathy-skills`（tool，状态 adopt）——与本条同源，本报告可作为该条目的内容拆解与操作说明；`Claude Code`（tool，状态 adopt）是主要配套执行环境（插件路径）；`Cursor`（tool，状态 watch）通过仓库自带的 `.cursor/rules/karpathy-guidelines.mdc` 接入，是本条给出的第二条落地路径，可作为把 Cursor 从 watch 往前推的具体抓手。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **证据**：原文直接引用 Karpathy 的推文三段，作为四类问题的来源（乱做假设不说、过度复杂化、改动自己没理解的代码）。仓库给出的验证信号：diff 中只出现被请求的改动；代码第一次就不过度复杂、减少返工重写；澄清问题发生在实现之前而不是出错之后；PR 干净最小、没有顺手重构。
- **只是主张**：四条原则与「working」信号均为作者/引述者的经验总结，原文没有给出对照实验、样本量或量化数据；stars 等指标不能作为效果证据。README 也未包含完整 CLAUDE.md 全文，实际内容需按第 1/2 步拉取后核对。
- **适用条件**：偏向谨慎而非速度，会牺牲速度；对琐碎任务价值低；面向 Claude Code / Cursor 这类会读上下文文件的编码智能体，其他形态的工具需要自己迁移规则。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**：在一个已有项目里按第 2 步追加 CLAUDE.md（或先在单个项目装插件，不要全局铺开），挑一个非琐碎的改动任务，按第 6 步把命令式要求改写成「先写失败测试→改到通过」的形式，让智能体自行跑完，再 review diff。

**判断有没有改善的指标**（全部来自原文的可观察信号，可人工核对）：
1. diff 里是否只有被请求的改动，没有顺手的重构/格式化/「改进」。
2. 是否第一次提交就足够简单，没有因过度抽象而重写（看是否出现未被要求的新文件、新抽象层、未要求的配置项）。
3. 澄清性问题出现在实现之前（而不是做错之后才回来问）。
4. PR 是否干净最小；自己改动造成的孤儿代码是否被清掉，而与任务无关的既有死代码是否只被提及未被删除。
5. 附加成本：留意琐碎任务上是否明显变慢——若变慢且无收益，说明适用范围没划清。
