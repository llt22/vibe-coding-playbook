# We ran AI agent swarms in Minecraft and Mindustry

- 结论：**值得一试**。把两个可直接借鉴的做法小范围试用：一是“共享文件 + 预约—直取—本人确认”的多智能体协作与核销协议；二是这套已开源的 Minecraft agent harness，用于搭建长时运行、能记忆和写脚本的 agent。理由是原文给出了可直接参照的协调产物模板和分配规则，但安装与配置细节在仓库而不在正文，因此先试不直接采用。
- 原文：https://labs.ycombinator.com/projects/games/index.html
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T01:56:19.828Z

## 是什么
YC Labs 与 Olam Labs 合作，在 Minecraft 和 Mindustry 中跑多智能体“蜂群”实验，并把用于长时运行 Minecraft agent 的 harness 开源（github.com/yc-software/minecraft-agent-harness）。harness 的核心是一个智能体循环：agent 观察世界、推理、记忆、执行动作、发消息、编写并执行脚本；它基于 Mineflayer 的脚本工具（受 Mindcraft 启发），核心 agentic loop 用 Pi 运行，效果被作者类比为 Hermes、OpenClaw 以及自家的 QM 这类前沿 agent harness。

最完整的一次实验是 Civ50：50 个 GPT-6.1 Sol agent 在生存模式 Minecraft 世界中跑 3 小时，唯一目标是“Build a thriving civilization”，给它们三样东西：agent 目录（directory）、共享沙盒（shared sandbox）、以及互相发私信的能力。结果是自组织出了伪政府、配给账本、成文规则、许可证和任命的管理员，共发出约 5,900 条消息。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 说明：原文只给了架构描述、产物样例和协调规则，没有给安装命令或完整代码。下面是原文可直接照做的部分；仓库安装细节需按 GitHub README 自行补足，本文不臆造。

1. **搭建长时运行的 agent harness。** 前提：目标环境有可脚本化的 API（Minecraft 用 Mineflayer）。按原文，harness 必须让 agent 具备六类能力：观察（observe）、推理（reason）、记忆（remember）、行动（act）、发消息（message）、编写并执行脚本（write/execute scripts）。这是通用的 agent 骨架，换成办公/研发场景时可映射为：读取状态、计划、持久记忆、调用工具、发通知、写脚本。

2. **给每个 agent 配三项共享设施。** 原文明确列出：
   - agent directory（谁是谁、顺序如何）；
   - shared sandbox（共享文件系统和共享箱子这类公共存储）；
   - DM（点对点私信）通道。
   这三项是多智能体自组织的前提条件，缺一项协调就会退化。

3. **用共享 Markdown 文件当协调中枢。** 原文出现了两类文件，结构可直接照抄：
   - `plans/settlement.md`（计划/事实板）：记录坐标、存量位置、优先级、禁令。原文片段：
     ```
     Primary storage Greta: (1526,70,1507), crafting table (1526,70,1505).
     Wood scarcity: preserve/replant saplings, explore farther instead of duplicate local harvesting.
     Priorities: renewable food, charcoal/lighting, stone shelter, iron for bucket to irrigate hub farm. Avoid redundant new storage.
     ```
   - `notes/food-queue.md`（账本/队列）：按人列 HP、food、坐标、缺口，并带时间戳更新，且显式声明新版本覆盖旧版本：
     ```
     ## Ration calculation (hunger target18; verify before serving)
     Cooked beef/pork restore8; cooked chicken/mutton restore6; bread5; apple4.
     - Basil food5: deficit13 -> 2 beef/pork or 3 chicken/mutton.
     ...
     ## Update time4387 (supersedes older values)
     ```
   可迁移要点：账本必须写“报告值 not live”“未确认发放不算已发”“新快照 supersede 旧值”，否则多人写同一份状态会互相覆盖、重复认领。

4. **执行“预约制 + 直接领取 + 本人确认”的物资发放协议。** 原文用一整场实验踩出了这条规则，原文原话是 "Tool pickup attribution alone is insufficient"（工具层面的拿取记录不足以证明送达），并明确 "never tossing into crowded refuge"（不要把稀缺物资丢进人群里）。可照做的流程：
   1. 分配者先在 DM 中指名：给谁、从哪个箱子、取几个；
   2. 在共享账本里写 RESERVED，标明接收人，其他人不得动该份；
   3. 接收人本人直接到指定箱子取用并食用/使用；
   4. 接收人本人回报新状态（如 HP/food 数值），才把该条标记为 served/confirmed；
   5. 未收到本人确认的，一律按“未送达”处理。
   反例也给了：Esme 误取了本该给 Noor 的鸡肉，直到 `## Correction time13207` 才由 Noor 本人“没有鸡肉、仍是 HP9 food4”纠正回来。

5. **维护事件日志做反馈信号。** 原文提到 agent 死亡时“a brief line was added to the death_log.md file”，即每次失败写一行。这是最轻量的效果信号来源：不追求复杂评测，先把失败事件结构化落盘。

6. **让 agent 自己写规则并落成文件。** 原文里 Ada 在第三夜后写下并执行：
   ```
   Stop optional bulk excavation/building and distant scouting. Idle in lit closed shelters until assigned short productive tasks.
   ```
   可迁移做法：把“优先级调整”写成可被所有 agent 读取的备忘录，而不是口头传达；备忘录里给出可执行的边界条件（停做什么、做什么、何时做）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（AI 已能做哪些还没想到交给它的工作）**：原文最有说服力的一点是，没人要求它们做行政管理，50 个 agent 自己演化出伪政府、配给账本、成文规则、许可证、任命操作员，并维持了 3 小时的持续运转。这说明“多主体状态下的记账、排队、分派、审计”这类事务性协调工作，可以整体交给 agent 群体，而不只是让单个 agent 干活。

- **任务匹配（什么工作适合怎样的模型、工具和协作方式）**：适合长时运行、状态随环境变化、需要读写共享产物的协调型任务；模型用了 GPT-6.1 Sol / Terra 这类前沿模型 + 前沿 agentic harness（原文自比 Hermes、OpenClaw、QM）；协作方式是“共享文件 + DM + 目录”的弱耦合结构，而非中央调度器——原文中领导权是自发生成，不是写死的。

- **条件供给（需要提供哪些信息、工具、权限和反馈）**：原文明确给了三件套：agent directory、shared sandbox、DM 能力；工具层是 Mineflayer 脚本工具；反馈靠共享账本里的状态更新和 `death_log.md`。原文还暴露了缺失条件的代价：death 除了掉装备没有其他惩罚，agent 仍因首夜 22 死而普遍变得过度保守、放弃原定任务——说明“反馈信号的强度”会直接改变 agent 行为策略，配反馈时要考虑这一点。

- **主动推进（哪些工作可由时间、事件或状态触发并持续完成）**：实验是连续 3 小时自主运行，触发明显是状态驱动（饥饿、夜晚、死亡、库存告罄），例如 `Emergency update time6927` 中 Priya 饥饿值归零后触发救援与投送链。但原文没有给出显式的触发器设计规范，只能确认“状态变化 → 写账本 → 触发他人行动”这条链路在跑。

- **效果验证（怎样判断确实改善了结果）**：原文的可迁移验证原则是“以接收方本人确认为准，不以工具调用记录为准”，并要求账本区分“提议 / 已预约 / 已确认送达”三种状态，且带时间戳与 supersede 规则。这是判断多 agent 协作是否真有效的最直接指标来源。

## 与已有做法的关系（对照给出的清单条目）

- **Hermes（watch）、OpenClaw（watch）**：原文明确把自己定位为与 Hermes、OpenClaw、作者自家 QM 同类的“前沿 agentic harness”，差别是它面向 Minecraft 这个具体环境，并开源了实现。所以这三者是同类参照物，本文的价值在于提供了一个可跑的具体实例，而不是新范式。
- **Claude Code（adopt）、Orca（try）、Cline（watch）、Cursor（watch）、Laya（watch）、abide（watch）**：原文未提及，也无法从材料推断直接关系。可迁移的只是协作协议（预约—直取—本人确认、共享账本带时间戳与 supersede），这套协议可以套在任何多 agent 或多人的工具链上，与具体是哪个编码工具无关。
- 清单中没有与“多智能体共享文件协调 + 游戏环境评测”直接对应的条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据/案例：**
- Civ50：50 个 GPT-6.1 Sol agent，生存模式，3 小时，目标为“Build a thriving civilization”；约 5,900 条消息。
- 首 90 秒内把出生点附近几乎所有的树砍完（资源抢夺的直观证据）。
- 层级按 directory 顺序形成，排第一的 Ada 成为事实上的领导者，其他 agent 向她申请批准。
- 首夜 22 死，占全程 34 死的多数；此后 agent 显著变得规避风险，Ada 因此下令停止可选的大规模挖掘与远距离侦察。
- 完整展示了账本从“报告值”到“已确认送达”的多轮状态推进，包括一次误领（Esme 吃了给 Noor 的鸡肉）和一次“已 pickup 但接收人无库存”的纠正。
- 另有一个正在跑的新殖民地：25 个 GPT-6.1 Terra agent（Twitch 直播），正文未给结果。

**属于作者主张而非证据的：** 多智能体动态是 AI alignment 最紧迫问题之一、蜂群既有极大用处（引“千 agent 蜂群解决数百开放数学问题”）也有极大风险（引“OpenAI-Hugging Face 事件”）——这些是动机论述，本文并未提供对应实验数据。Minecraft 之外只提到也在 Mindustry 做了实验，但抓取到的正文在 Mindustry 部分之前就截断了，无任何细节。

**适用条件与局限：**
- 游戏环境里死亡几乎无代价（只掉装备、加一行日志），真实工作里失败有成本，行为策略不可直接照搬。
- 50 个 agent 的规模与消息量（约 5,900 条）意味着巨大的 token/时间成本，原文没有给成本数据。
- 自组织出的层级来自 directory 顺序，这是评测设计带来的伪影，迁移时应主动随机化顺序或显式指定角色。
- 原文是项目介绍页，不是教程；harness 的具体安装、配置、提示词需看仓库，本文无法据材料给出。
- Mindustry 部分内容缺失，只能依据摘要判断其存在，不能据此下结论。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**路线 A：试用协调协议（成本最低，建议先做）**
在任何已有多个 agent 或多人的共享任务（如共享仓库的任务分派、共享库存的物料领取）里，落地第 4 步的“预约—直取—本人确认”协议和带时间戳、带 supersede 的共享账本。最小试用：选一件会被多人/多 agent 重复认领的事（如领取稀缺资源、认领工单），跑两周。

**路线 B：试用 harness（成本较高）**
按仓库 README 装好 harness，先用远小于 50 的规模（如 5 个 agent）、短时长（如 30 分钟）跑一个必须协作才能完成的目标，复现“共享文件 + DM + 目录”三件套，观察是否自发出现分工。

**判断有没有改善的指标（都能从原文的产物里直接取到）：**
1. **错配率**：误领/重复领取次数 ÷ 总发放次数。原文的对照点是“投放人群”导致 Esme 误领那一类事故，协议上线后应趋近 0。
2. **核销确认率**：账本中标记 served 且附本人确认的条目 ÷ 全部标记 served 的条目。原文反复出现“NOT confirmed served”，这个比值就是协作可信度。
3. **重复劳动率**：同一资源被两个 agent 重复采集/重复建造的次数（原文明确把 "Avoid redundant new storage"、"avoid duplicate crafting" 写成规则，说明这是高频浪费）。
4. **未服务高危对象的滞留时长**：如 Noor 从被记为 food4 到真正吃到三文鱼之间的时间戳差（time4387 → time12247），这是协调系统的端到端延迟。
5. **过度保守倾向**：首夜大规模死亡后任务放弃率是否异常升高——如果协议带来的确定性反而让 agent 更敢冒险做事，说明反馈质量改善；如果只是变保守，说明只是把风险转移了。
6. **失败事件日志密度**：`death_log.md` 一类日志的条数与类型分布，用于判断是否只是把问题藏起来了。
