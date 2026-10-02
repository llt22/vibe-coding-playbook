# gongdear/cline-pilot

- 结论：**值得一试**。建议小范围试：照 README 给出的安装命令、首次环境配置和「冷启动用强模型、稳态用本地小模型」的两阶段流程，在一个已有小仓库上跑通一次「冷启动→小批次任务→脚本监控→证据验收」的闭环。理由是可照做的命令与流程在原文中已经比较具体，但 4 段回报格式、6 项验收清单等核心内容位于 SKILL.md 和 references/*，本次只拿到 README，且验证数据均为作者自述。
- 原文：https://github.com/gongdear/cline-pilot
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T04:26:59.542Z

## 是什么

cline-pilot 是一个遵循 [Agent Skills 开放规范](https://agentskills.io/specification) 的技能包（MIT，GitHub 91 stars）。它的定位是：让智能体充当用户的**代理**去驱动 Cline CLI 完成编码任务。

它声明的完整链路是：派发任务 → 非交互或交互地运行 Cline → 从会话文件 + 硬证据（git / 测试报告）监控进度 → 用固定「四要素格式」把决策点回报给用户 → 报告完成前按 6 项验收清单核对 → 同时**按项目标签类学习用户的偏好，逐步替用户做决定**。

README 明确划了边界：技能本身**不持有项目架构知识**（那属于项目自己的 memory bank + clinerules），也**不做单方面技术决策**——push、删除、写 DB、花钱、改全局配置这类硬约束动作一律先问用户。

## 具体做法

以下步骤均来自 README，前提条件已标注。

1. **安装**（前提：目标 agent 支持 Agent Skills 规范，如 Hermes / Cline / Claude Code / Codex / Cursor / OpenCode）。

```bash
# 方式一：通用 skills CLI
npx skills add https://github.com/gongdear/cline-pilot

# 方式二：把技能目录拷进 agent 的 skills 目录
#   Hermes:      ~/.hermes/skills/
#   Cline:       ~/.cline/skills/
#   Claude Code: ~/.claude/skills/
#   Codex:       ~/.codex/skills/
mkdir -p ~/.hermes/skills && cp -r cline-pilot ~/.hermes/skills/
```

2. **首次使用时完成本地配置**（前提：先想清楚自己的开发环境）。agent 会询问：conda / python 环境名、工具链如何进入 PATH、任务分支的命名方式，并写入 `references/local-config.md`（可参考 `references/local-config.example.md`）。该文件是**私有的、被 git 忽略**。

3. **满足冷启动门禁**（前提：任何 memory bank 被启用之前）。必须先把默认的全局 memory-bank 提示词放到位，模板在 `assets/global-memory-bank-prompt.md`，README 强调要**逐字使用**。

4. **选择冷启动路径**：
   - 还没有代码：规则由 agent 逐维度询问用户后组装；
   - 遗留代码：规则基于对代码的扫描来落地。

5. **采用两阶段模型策略**（README 称在生产 Java 后端上验证过）：
   - **初始化阶段用强的长上下文（付费）模型**：整项目代码库扫描、依据代码实际行为撰写项目规则（`clinerules` / memory-bank 种子）、编写一到两个有代表性的**模板测试/代码范式**（断言风格、mock 粒度、命名、边界覆盖）。这一阶段读多、长上下文多。
   - **稳态阶段切到小的本地模型跑任务循环**：规则和模板就位后，每个批次都是范围紧凑、有明确 spec 的小任务（目标类、测试文件路径、mock 列表、断言要求）。README 称维护者用 Ollama 本地跑 `qwen3.8:27b` 执行所有批次任务，在一个 7 模块 Java 后端上交付了 50+ 个测试类。
   - **经验法则**：前沿模型买一次规则，本地模型每天跑纪律。若某个本地批次**同一断言连续失败 3 次**，说明是模板/规则的缺口——把**那一个批次**升级回更强模型，而不是继续消耗本地重试。

6. **派发编码任务**：把指向 Cline CLI 的任务交给 agent，技能激活、挑选合适模式、注入提示词（固定首行 `active memory bank`）、后台运行。

7. **监控进度**：用只读脚本读取会话消息与 git / surefire 证据。

```bash
python3 scripts/session_report.py 15 /path/to/repo
```

8. **验收后再报完成**：走 6 项验收清单；原则是**证据优先于自我报告**——完成由 git status、测试报告数字、非空产物证明，绝不采信 agent 自己的声明。

9. **维护学习闭环**：每次纠正/决策记入 `decision-log.md`（按项目标签类）→ 累计 **≥2 个一致样本** → 蒸馏进 `SKILL.md` 的偏好段。

10. **硬约束动作先问用户**：push、删除、写数据库、花钱、改全局配置，一律先确认。

11. **自检命令**（前提：装好 skill 与 Python 3）：

```bash
npx @anthropics/skills-ref validate .   # 或: skills-ref validate ./cline-pilot
python3 -m py_compile scripts/session_report.py
python3 scripts/session_report.py 5 /path/to/repo
```

技能包采用渐进披露：`SKILL.md`（<150 行）仅在激活时加载，`references/*` 按需加载，`scripts/session_report.py` 是确定性代码（仅标准库），避免 agent 每次重新临场发挥监控逻辑。

## 对应的研究问题

**1. 能力发现**：它把「驱动编码 CLI 做长任务」整件事交给 agent 代理，而不只是写代码——包括派发、后台运行、持续监控、决策点回报、验收。README 特别指出监控依据是会话文件 + git/测试报告这类硬证据，而非 agent 自我报告。

**2. 任务匹配**：给出了明确的分阶段模型匹配——冷启动用强长上下文模型（读重、上下文重），稳态用小本地模型（任务颗粒度小、spec 明确、有模板和验收纪律兜底）。这正好回答了「什么工作适合怎样的模型」。

**3. 条件供给**：需要先供给——开发环境信息（conda/python env 名、PATH 方式、分支命名）、私有 `references/local-config.md`、项目侧的 memory bank + clinerules（架构事实）、以及必须先到位的全局 memory-bank 提示词。权限上明确划出硬约束红线（push/删除/写 DB/花钱/改全局配置先问）。反馈上靠 decision-log 按标签类回收纠正。

**4. 主动推进**：长任务可后台运行并通过 `scripts/session_report.py` 轮询监控（状态监控）；纠正会被记录并蒸馏成稳定偏好，属于持续累积型推进。原文未明确给出时间或事件触发器的机制（示例参数 15、5 的含义也未说明），这部分依据不足。

**5. 效果验证**：6 项验收清单 + 证据优先原则（git status、测试报告数字、非空产物），加上只读监控脚本 `session_report.py`；「同一断言连续失败 3 次」被定义为规则/模板有缺口的判定信号。

## 与已有做法的关系

- **Agent skills（adopt）**：本条正是一个符合 agentskills.io 规范的 Agent Skill，可作为该概念的一个具体可落地样例（渐进披露布局、SKILL.md 与 references 分离、确定性脚本优先）。
- **Cline（watch）**：cline-pilot **不替代** Cline，而是编排 Cline CLI（非交互/交互两种模式）。它给出了把 Cline 从「watch」推进到可操作的路径：环境配置 + 监控脚本 + 验收清单 + 两阶段模型策略。但原文没有提供替代 Cline 本身能力的证据。
- **Claude Code（adopt）/ Cursor、Hermes、OpenCode（watch）**：README 声称「任何支持该规范的 agent 都可工作」，并列出这些名字，但仅止于文字声明，未给出在各自环境下的实际配置步骤或验证案例。
- **Semble（try）**：清单中没有直接关系。

## 证据与局限

原文给出的数据/案例：
- README 称两阶段模型策略「在生产 Java 后端上验证过」。
- 维护者本地用 Ollama 跑 `qwen3.8:27b`，在一个 7 模块 Java 后端上交付 50+ 个测试类。

以上均为**作者自述**，仓库内没有可核对的基准、对比数据或第三方复现记录，91 stars 也说明成熟度和外部验证有限。

只是主张、未给出细节的部分：
- 「固定四要素格式」回报决策点——格式本身没在 README 里列出。
- 「6 项验收清单」——具体条目未给出。
- 冷启动门禁、两条冷启动路径、学习闭环的阈值（≥2 个一致样本）都只有概述，逐字内容在 `SKILL.md` 与 `references/*` 中，本次材料只到 README 一层。
- `session_report.py` 的参数含义（示例中的 `15`、`5`）原文未说明，照抄命令时需自行确认。

适用条件：目标 agent 支持 Agent Skills 规范；需要 Cline CLI；冷启动阶段愿意使用付费长上下文模型；稳态阶段需要本地模型运行条件（如 Ollama）。此外该项目与 Cline 强绑定，若不用 Cline CLI，主要只能借鉴其设计原则（确定性脚本优先、证据优先于自述、学习闭环）而非直接套用。

## 怎么试、怎么验证

**最小试用方式**（在一个已有小仓库上，1 周内可完成）：

1. 安装 skill（`npx skills add` 或拷贝目录），跑一次首次配置，生成私有的 `references/local-config.md`。
2. 先放好全局 memory-bank 提示词模板（冷启动门禁），再按「遗留代码」路径让强模型做一次代码扫描，产出 clinerules / memory-bank 种子 + 1~2 个模板测试。
3. 用本地模型跑 1~2 个 spec 明确的小批次（写清目标类、测试文件路径、mock 列表、断言要求）。
4. 用 `python3 scripts/session_report.py <n> /path/to/repo` 监控，用 git status 和测试报告验收。
5. 至少记录一次纠正到 decision-log，观察是否出现「同类决策无先例」的减少。

**判断有没有改善的指标**：

- **硬证据类**：该批次测试是否通过、是否产出非空文件、git 是否有预期改动（不采信 agent 自述）。
- **失败信号**：同一断言连续失败次数——达到 3 次即判定为模板/规则缺口，把该批次升级到强模型，并记录这次升级是否解决了问题。
- **人工介入成本**：相比直接在 Cline 里手动操作，需要用户处理的决策点回报次数是否下降。
- **冷启动收益**：第一批次完成冷启动后，第二、第三批次的返工量是否明显低于冷启动前的手动基线（验证「一次好的冷启动省掉后续大部分返工」这一主张）。
- **学习闭环是否真的在收敛**：decision-log 中稳定偏好条目是否增长，同类决策落到「no precedent」的比例是否下降。
