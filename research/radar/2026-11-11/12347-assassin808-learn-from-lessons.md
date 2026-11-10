# assassin808/learn-from-lessons

- 结论：**值得一试**。先拿自己的历史对话跑一遍 lessons scan → dream → view，人工筛掉低质条目后再 inject 进 CLAUDE.md（或 AGENTS.md），因为这条命令链可直接照做、能把“每次纠正”沉淀成可复用的规则；但证据只有作者一人的自评、README 也没给出 lesson 格式样例和注入内容示例，所以只值得小范围试，不宜直接全面铺开。
- 原文：https://github.com/assassin808/learn-from-lessons
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T20:14:56.205Z

## 是什么

`learn-from-lessons` 是一个本地运行的命令行工具，它读取你机器上已有的编码 agent 对话记录（README 明确点名 Claude Code、Codex、opencode），从中找出“你纠正 agent 的那一刻”，把纠正转成带原文引用的短教训（lesson），再让 agent 下次加载。

它要解决的问题很具体：你跟 Claude Code 说过“先别 push”“我问的是为什么，不是让你改”“这个数不是表里的”，下次它照样犯。工具的定位就是把这类一次性纠正变成持久规则。

结构上，lesson 分三层：

- **principle**：原则，如“先问清楚是谁在做决定”
- **rules**：原则下的规则，如“只有明确 go-ahead 之后才 push”
- **cases**：很窄的案例，如“在这个 repo 里，Overleaf 是唯一事实来源”

每条 lesson 标注它来自哪几段对话；被观察到两次后标记为 verified。设计上参照 Anthropic 的 *The Components of Agent Memory*：transcript 是事实来源，lesson 要回查 transcript 校验，默认只加载一个小索引。

## 具体做法（编号步骤；可直接复制的命令、提示词原样放进代码块；写清每步的前提）

**前置条件（README 明说的）**：Python 3.9+，无其他依赖；全部本地运行；你此前用 Claude Code / Codex / opencode 在本机留下过对话记录（工具读的是“已经在你机器上的 transcript”）。

1. **安装**（前提：有 pipx）：

   ```bash
   pipx install git+https://github.com/assassin808/learn-from-lessons
   ```

2. **盘点本机素材**：

   ```bash
   lessons scan          # what's on this machine: sessions, corrections
   ```

   先看能扫出多少 session、多少处纠正。如果纠正数很少，后面几步的产出也会很少。

3. **把纠正提炼成 lesson**（前提：本机有可用的 `claude` 或 `codex` CLI 及其额度，README 说这一步“用你自己的 claude / codex CLI”）：

   ```bash
   lessons dream         # turn corrections into lessons (uses your own claude / codex CLI)
   ```

4. **人工过一遍产出**：

   ```bash
   lessons view          # browse them: list, graph, evidence
   ```

   按列表、关系图、原文证据三种视角看。重点看每条 lesson 是否真的附了原始引用、是否写得可执行。README 没有给出 lesson 的实际文本样例，这一步只能靠你自己判断。

5. **注入给 agent**（前提：确认目标文件路径；`--apply` 会写入，建议先备份 CLAUDE.md）：

   ```bash
   lessons inject --target CLAUDE.md --apply   # let your agent load them
   ```

6. **按场景隔离**（README 的例子：写论文时不该加载 git push 相关的教训）：

   ```bash
   lessons index --scenario writing-paper
   lessons search "about to launch the eval runs" --context "$(git log -1)"
   ```

7. **其他接入方式**（README 说这些都随仓库提供）：
   - Claude Code skill：`skill/SKILL.md`
   - 给 Codex / opencode 的 `AGENTS.md` 片段：`integrations/AGENTS.md`
   - MCP server：

     ```bash
     lessons mcp
     ```

8. **细节文档位置**：`docs/GUIDE.md`、`docs/LESSON_FORMAT.md`（README 指向但正文未展开，需要自行阅读确认 lesson 格式与索引机制）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：对应“AI 能做但平时想不到交给它的工作”——从历史对话里批量挖出“用户纠正”这种平时没人会去手工整理的时刻，并归纳成规则。这是一个典型的“人不会做、但机器适合做”的活。
- **任务匹配**：给出了明确的分工——扫描/检索/注入用本地 CLI 工具；提炼 lesson 这一步交给用户自己的 claude / codex CLI；加载侧按场景切分（`--scenario`、`search` 带 `--context`），默认只加载一个小索引而不是全量 lesson，属于“按需检索 + 小上下文”的协作方式；同一份 lesson 可分发给不同 agent（Claude Code skill / AGENTS.md / MCP）。
- **条件供给**：需要给出的是——本机 transcript 的读取权限（工具直接读已有记录）、一个可调用的 claude/codex CLI 及其额度、目标文件的写权限（`--apply`）。反馈供给方面，它要求每条 lesson 附原始引用、被看到两次才 verified，相当于给 lesson 建立了证据门槛。
- **主动推进**：**README 没有提供任何基于时间、事件或状态的自动触发机制**（没有 cron、watch、hook 的说明），scan / dream / view / inject 全是手动命令。这一条目前没有依据，不能算它的能力。
- **效果验证**：README 给了一个自评：47 个“新情境”（与 lesson 来源不同的项目），agent 遵循用户规则的比例在无 lesson 时 85%、有 lesson 时 98–100%，且“在其他地方没有变得过度谨慎”；并指出测试在仓库 `eval/` 目录里。这是唯一的效果数据，且作者自陈是“one person's data so far”。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：本工具直接产出可注入 `CLAUDE.md` 的内容，并附赠 Claude Code skill，本质是 Claude Code 的“记忆/纠正沉淀”外挂，可与现有 Claude Code 用法叠加而不冲突。
- **OpenCode（watch）**：README 把 opencode 列为可读取的 transcript 来源之一，并提供 `AGENTS.md` 接入块。
- **Cursor（watch）、Cline（watch）**：README 在 Contributing 里明确说**正在找人写** Cursor、Aider、Gemini CLI、Cline 的读取器，即当前尚不支持这几个。清单里 Cursor / Cline 的 watch 状态与之一致。
- 清单中**没有**“从纠正中学习 / agent 记忆管理”类的同类条目，本工具在这条线上是新增能力。

## 证据与局限

**原文给出的数据/案例**：

- 47 个新情境的对照结果：无 lesson 85%，有 lesson 98–100%，且未观察到过度谨慎。
- 一个具体的 README 使用示例（写论文场景下按 `--scenario writing-paper` 过滤、以及用 `search` + `$(git log -1)` 作为上下文检索）。
- 提供了 `eval/` 目录作为测试出处（但给出的材料里没有 eval 的内容）。

**属于作者主张、未经原文数据支撑的部分**：

- “Every time you correct your coding agent, it should learn” 是价值主张，不是结论。
- lesson 三层结构（principle / rules / cases）和“两次即 verified”的有效性，原文只给了设计理由（引用 Anthropic 的 agent memory 文章），没给对照数据。
- 「全本地运行」是 README 声明，未给出数据流向说明；`lessons dream` 会调用你本机的 claude / codex CLI，这部分内容实际上会进模型，是否算“纯本地”需自行确认（原文未展开）。

**适用条件与局限**：

- 作者自陈只有一个人的数据（one person's data so far），30 stars，属于早期个人项目。
- README 篇幅很短：没有 lesson 的实际文本样例、没有 `dream` 用的提示词、没有注入到 CLAUDE.md 后的样子、没有配置项字段、没有 lesson 存储路径。这些都需要读 `docs/GUIDE.md` / `docs/LESSON_FORMAT.md` 才能落地。
- 效果高度依赖你已有的历史对话质量与数量；新用户或新项目上可能扫不出足够的纠正。

## 怎么试、怎么验证

**最小试用方式**：

1. 选**一个**历史较长、你确实反复纠正过 agent 的项目，只在这一个项目上试。
2. 备份现有 `CLAUDE.md`（或 `AGENTS.md`）。
3. 跑 `lessons scan`，记录扫出的 session 数与纠正数——这是素材量的基线。
4. 跑 `lessons dream`，然后 `lessons view` 逐条人工审核，**只保留**：附了原文引用、你认可其表述、且能写成“遇到 X 就做 Y”的条目。把泛泛而谈或过度概括的删掉。
5. 不要一次全量注入。先用 `lessons index --scenario <你的场景>` 限定范围，再 `lessons inject --target CLAUDE.md --apply`。
6. 保留一份注入前的 `CLAUDE.md` 作为 A/B 对照。

**判断有没有改善的指标**：

- **同类纠正次数**：注入前后各取 10–20 个新任务，统计“同一类纠正”被你重复说了几次。这是最直接的指标，也对应它 47 情境实验的口径。
- **每条 lesson 的命中情况**：README 里 lesson 被“看到两次”才 verified，你可以反过来检查——注入的 lesson 里有多少条真的在新会话中被触发过、触发后是否真的避免了纠正。
- **误伤/过度谨慎率**：注入后 agent 是否开始频繁追问、拒绝执行本来可以做的事。原文特意声明“without becoming over-cautious elsewhere”，这正是要盯的反向指标。
- **上下文成本**：注入后 `CLAUDE.md` 增长了多少、每次会话多花多少 token。README 说默认只加载小索引，实际效果要自己量。
- **提炼质量**：`lessons view` 里带原文引用、可直接执行的 lesson 占比。低于一半就不要往下推。

**淘汰条件**：如果 `scan` 扫不出足够的纠正、或 `dream` 产出的 lesson 大多没有可追溯的原文引用、或注入后同类纠正次数没有下降，就停在 study 阶段，只借鉴它“从历史纠正里挖规则并附证据”的思路，不继续用这个工具。
