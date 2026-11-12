# enoch3712/spine-hero-skill

- 结论：**值得一试**。建议小范围试：把它“脚本化关卡（用数值硬门槛判定）+ 独立模型按历史缺陷清单复查 + 人类终审回灌成新检查”的三层校验，移植到一个产出可被程序测量的任务上；整套 spine-hero 只在单一 2D 骨骼动画项目上验证过，且建模与抓帧脚本要自己写，不宜整体照搬。
- 原文：https://github.com/enoch3712/spine-hero-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T13:55:41.942Z

## 是什么

`spine-hero` 是一个面向 Claude Code / Codex / Cursor 的 Agent Skill：用一张 2D 游戏主角的静态彩绘图，通过 Spine 骨骼把角色做成可编程的 rig（骨骼绑定），此后每个动作（走、盾击、跃击等）都写成代码（关键帧 + IK），不再逐帧绘制。

它真正值得关注的是质量控制结构，这也是初筛理由指出的可迁移部分：

- **确定性关卡（gate）**：一个纯 Node、无依赖的脚本 `gate.mjs` 对每次抓帧的 `metrics.json` 做数值判定（滑步、地面速度、裂缝、动作未回到 rest、画出主角包围盒外），**不让模型来判数字**。
- **独立缺陷检查**：第二个独立模型在 2 倍特写（脚、头）上逐条对照 `defects.md`——一份“人类曾经抓到过的所有缺陷”清单（原文 13 条）。
- **人类终审回灌**：人做最后判断，**每抓到一个新缺陷，就变成缺陷清单的一行或一条新关卡检查**。
- **编排层**：每个动作一份 brief、一个 run，可并行；角色按档位分层（orchestrator / author / gate / review / check / video / image / human）；有共享锁、预算、单 agent 退化为分遍执行。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（原文明确列为“你必须自备”）：**一张完成度足够、侧视、静止姿态的主角彩绘图；一个 Spine 风格的骨骼运行时（原项目用 Spine 4.2 + PixiJS 官方运行时）；一个“从彩绘到 rig”的构建方式（原项目的构建脚本**未随仓库提供**，`references/rig.md` 只描述方法，也可在 Spine 编辑器里手搭）；一个能从你的引擎抓帧的脚本（逐帧播放、无光照与有光照各渲一遍、测量、写出 `metrics.json`——**也未随仓库提供**，`references/gate.md` 只给契约）；Node 18+；可选 image-to-video 模型和图像模型；一个编码 agent（理想情况能起子 agent）。

### 第 0 步：先定“抓帧契约”，再写第一个动作

原文明确：`metrics.json` 必须在第一个动作之前写好，“没有它，任何东西都无法被关卡判定或被复审”。先照 `assets/metrics.example.json` 与 `references/gate.md` 定义字段与阈值。

### 第 1 步：安装 skill

Claude Code 插件方式（仓库自身即 marketplace）：

```
/plugin marketplace add enoch3712/spine-hero-skill
/plugin install spine-hero@spine-hero-skill
```

或从 shell：

```sh
claude plugin marketplace add enoch3712/spine-hero-skill
claude plugin install spine-hero@spine-hero-skill --scope user
```

也可直接拷贝文件夹（此后 skill 名为 `/spine-hero`）：

```sh
git clone https://github.com/enoch3712/spine-hero-skill.git
mkdir -p ~/.claude/skills
cp -R spine-hero-skill/skills/spine-hero ~/.claude/skills/        # 所有项目
# 或：cp -R spine-hero-skill/skills/spine-hero <project>/.claude/skills/   # 单个项目
```

Codex（软链接到 Codex 读取的目录）：

```sh
git clone https://github.com/enoch3712/spine-hero-skill.git
mkdir -p ~/.agents/skills
ln -s "$PWD/spine-hero-skill/skills/spine-hero" ~/.agents/skills/spine-hero     # 所有项目
```

Cursor 会读 `.claude/skills/`、`.cursor/skills/`、`.agents/skills/`（项目级与家目录级），因此上面任一份拷贝或链接对 Cursor 同样生效。

### 第 2 步：先跑通关卡本身（不涉及你的美术资产）

```sh
node --test skills/spine-hero/scripts/gate.test.mjs
cp skills/spine-hero/assets/metrics.example.json /tmp/metrics.json
node skills/spine-hero/scripts/gate.mjs /tmp/metrics.json       # PASS example-hero walk: 8/8 checks
```

### 第 3 步：编排——每个动作一份 brief、一个 run

orchestrator 为每个动作写一份 brief 并各起一个 run，动作并行构建。多作者同时构建时用 `scripts/with_lock.sh` 在共享锁下跑“构建 + 关卡”。只有一个 agent 时，按 `references/orchestration.md` 把各角色当作分开的 pass 依次跑。

### 第 4 步：参考视频只取节奏

用 image-to-video 模型把主角自己的彩绘动起来，**只取时序与节拍，绝不描摹、绝不当帧用**；agent 把触地帧、过渡帧、步时、摆高等读进 `beats` 文件（如 `walk-beats.json`）。没有视频模型就手写 beats（`references/reference-video.md` 给了提示词模板与无视频路径）。

### 第 5 步：补画“彩绘从未展示的部分”

图像模型以彩绘为参考，补画：被遮挡的部位（如远侧手臂）、新装备（斧、锤、塔盾）、快速打击的关键姿势。

### 第 6 步：把动作写成代码并自检

强编码模型在 rig 上用关键帧和 IK 写出该动作，构建、抓帧、看自己的结果。

### 第 7 步：过关卡（数值判定，模型不参与）

```
$ node skills/spine-hero/scripts/gate.mjs out/walk/try1/off/metrics.json --kind walk --limits my-gate-limits.json
FAIL example-hero walk: 7/8 checks | slidePxMax=3.1 (limit {"max":2})
```

阈值文件用 `scripts/gate-limits.json` 起步，但原文强调它只在**一种抓帧尺寸**上校准过；`references/gate.md` 说明哪些阈值可平移、其余如何为首个主角重设。失败后按 `references/locomotion.md` 的对应条目改（例：脚跟着地 + 地面剥离被判为脚底骨滑步 → 改为脚掌平落、剥离放到空中 → 复跑 `PASS example-hero walk: 8/8 checks`）。

### 第 8 步：独立模型按“历史缺陷清单”复查

中端模型先复审 `gate.json` 与接触表（sheets）；再由一个**独立**的模型在 2 倍脚部与头部特写上逐条过 `defects.md`（例：第 5 条“远侧靴子和近侧一样亮”），命中就回给作者修，然后关卡、复审、检查三道全部重跑。

### 第 9 步：人类终审，并把漏网缺陷固化

orchestrator 自己看图、把视频给人看；人抓到的每个问题写成 `defects.md` 的第 N 行，或加成一条新的关卡检查。这是闭环的关键一步，不是可选装饰。

## 对应的研究问题

**1. 能力发现（哪些工作还没想到交给 AI）**
- 把“逐帧画动画”整体替换为“在骨骼上用代码写动作”——原文用旧方案做了对照：10 个片段、403 帧、换武器就得全部重做；新方案只换挂在骨骼上的装备即可。
- 把“质检”拆给脚本（数值判定）和第二个独立模型（对照历史缺陷清单查特写），而不是让生成者自评。

**2. 任务匹配（什么工作配什么模型 / 工具 / 协作方式）**
- 强编码模型：写每个动作的关键帧与 IK，并自看结果。
- 中端模型：复审 `gate.json` 与接触表。
- 独立模型：只做特写缺陷对照检查（与作者分离，避免自证）。
- 图像模型：补画未见部位、新装备、关键姿势。
- image-to-video 模型：**只提供时序节拍**，明确禁止当帧使用。
- 脚本：所有数值判定，明确“没有模型来判这些数字”。
- 人：终审与缺陷清单维护。
- 原文注明模型名只是原项目所用（Claude Opus 5.5 / Sonnet 5.5，规划用 Fable 5.2），不是要求；同档位模型即可。

**3. 条件供给（需要哪些信息、工具、权限、反馈）**
- 信息：一张完成度足够的侧视静止彩绘；人类历史抓到的缺陷清单；参考视频的节拍文件。
- 工具：Spine 风格运行时（加权网格、IK、attachment keys、draw order、linked meshes）、抓帧脚本、Node 18+。
- 权限/契约：先写 `metrics.json` 抓帧契约，否则无从判定与复审。
- 反馈：关卡失败信息 → 作者改 → 复跑；人类新缺陷 → 清单/新检查。
- 成本：模型 token 预算（`orchestration.md` 列了原始预算与单个主角的大致总量），视频与图像模型可能另外收费。

**4. 主动推进（可由时间 / 事件 / 状态触发并持续完成）**
- 每个动作一个 run，可并行；`with_lock.sh` 支持多作者在共享锁下并发构建+关卡。
- 流程内触发明确：构建 → 抓帧 → 关卡 → 复审 → 检查 → 终审，失败自动回退到作者。
- 原文没有给出按时间或外部事件调度的机制，这一项只有流程内触发与并行编排的依据。

**5. 效果验证（怎么判断确实改善了结果）**
- 关卡给出布尔结果与逐项数值（`PASS 8/8`、`FAIL 7/8 | slidePxMax=3.1 (limit max 2)`），可复跑、可对照。
- 独立模型在 2 倍特写上逐条对缺陷清单，输出可定位（“第 5 条”）。
- 人类终审是最终判定，且判定结果回流为新增检查项——**验证标准本身随使用增长**，这是原文最有价值的一条方法论。
- 对照证据：同一套动作在新旧两种方案下的产出对比（同一 taunt：旧 44 帧来自生成视频 vs 新为彩绘部件由代码驱动）。

## 与已有做法的关系

清单中有相关条目：**Claude Code（adopt）**、**Cursor（watch）**、**Agent skills（adopt）**。

- **Agent skills（adopt）**：本仓库是 Agent Skills 开放格式的一个完整实例——`SKILL.md`（短，使用时加载）+ `references/`（按需读取：pipeline、rig、locomotion、moves、reference-video、defects、gate、orchestration）+ `scripts/`（可执行关卡与其测试）+ `assets/`。可作为“一个技能该怎样组织、怎样把规则与可执行校验放在一起”的样本。
- **Claude Code（adopt）**：提供两条可用安装路径（插件 marketplace、拷文件夹），且原文记录 `claude plugin validate .` 在本仓库通过（仅有 licence/icon/author 等 metadata 警告）。
- **Cursor（watch）**：原文说明 Cursor 会读 `.claude/skills/`、`.cursor/skills/`、`.agents/skills/` 及其家目录版本，因此上面任一份拷贝或链接即可生效；但“把文件夹拷进去算安装手段”原文标注为**推断**，`.cursor-plugin` 的 marketplace schema 与“仓库根为插件路径”的条目**未确认**，Cursor 的插件安装路线**未测试**。
- **Codex**：`~/.agents/skills/` 与软链接、`codex plugin marketplace add owner/repo`、根 `plugin.json` 指向 `skills/` 为文档确认；命令行插件安装与“路径为仓库根”的 marketplace 条目未确认。

## 证据与局限

**原文给出的可核证据**
- 可复跑的命令与真实输出：`gate.test.mjs` 通过；示例 `metrics.json` 得到 `PASS example-hero walk: 8/8 checks`；失败样例 `FAIL ... 7/8 checks | slidePxMax=3.1 (limit {"max":2})`。
- 具体缺陷数量：`defects.md` 收录 **13 条**“人类抓到、而自动检查漏掉”的缺陷，并说明每条怎么看出来。
- 新旧方案对照：旧设计为翻页动画，10 个片段、403 帧，换武器就要重做全部片段；新设计为一张彩绘切分上骨架、每个片段写成代码，装备挂在自己的骨骼上可替换而所有动作仍可播放。
- 六个动作在同一骨架上的产出展示（盾击、盾墙、举盾过头、嘲讽、震地猛击、跃击）。

**属于作者主张、未见跨场景验证的部分**
- “这套流程可迁移到其他工作”是**推断**（初筛理由也是这么推断的），原文没有跨领域案例。
- 各角色的档位分配、预算与“单 agent 分遍执行等价”属原项目经验，非对照实验。

**明确的适用条件与局限**
- 只在一个游戏上构建：侧视彩绘英雄、Web 运行时、Spine 4.2；**未在其他引擎或美术风格上试过**。
- rig 构建与抓帧**不随仓库提供**，而原文说它们占设置工作的大头；仓库只发关卡（含测试）和一个小锁脚本。
- 关卡的像素阈值只在一种抓帧尺寸上校准过，换尺寸需按 `gate.md` 重设。
- 检查会漏：缺陷清单之所以存在，正是因为自动检查漏过；人仍需导演与判定，且要预期自己往清单里加行。
- 有 token 成本，视频/图像模型可能另外计费。
- Codex 与 Cursor 的插件安装路线原文自述**未测试**。
- 本文依据的是仓库 README（含目录结构、命令与限制说明）；`references/` 里的具体条目内容、`gate.mjs` 源码本身未在材料中，无法核对实现细节。

## 怎么试、怎么验证

**最小试用（不动美术管线，只抄“关卡”这一层）**
1. 选一个**产出可被程序测量**的任务（生成的数据文件、代码改动、报表、结构化文档等），不要选只能靠人打分的任务。
2. 先写“抓帧契约”：定义该任务的 `metrics.json` 等价物——一组机器可读的检查字段与硬阈值（照 `assets/metrics.example.json` 与 `gate-limits.json` 的形状）。
3. 用 Node/Python 写 3–5 条确定性检查，跑法照 `gate.mjs`：接受一个 metrics 文件、按 kind 与 limits 判定、输出 `PASS n/m checks` 或 `FAIL` 并打印越界项与阈值（如 `slidePxMax=3.1 (limit max 2)`）。先为它能写出测试（照 `gate.test.mjs` 的 `node --test`）。
4. 让执行 agent 自己构建 → 抓取 → 过关卡 → 看失败项改 → 复跑。**关卡判定不许交给模型**。
5. 加一层独立复查：另起一个模型（或同模型另起一次不含上文的新会话），只带一份“历史缺陷清单”，对产出做定点复查；作者与复查者必须分离。
6. 人只做终审，并把每抓到一个漏网问题写成清单新行或新检查。
7. 若确实做 2D 骨骼动画，可直接按上文第 1–3 步装 `spine-hero`，先确认示例 `metrics.json` 跑到 `PASS 8/8`，再为自己的首个主角重设 `gate-limits.json`，再进入第 3 步的编排。

**判断有没有改善的指标**
- 首轮过关率（`PASS 8/8` 的比例）与平均返工轮数——应随检查完善先降后升（前期暴露更多问题）。
- 缺陷清单覆盖率：人抓到的缺陷中，有多少被固化成新检查项（长期应趋高，人抓到的新缺陷数应趋低）。
- 每轮人工终审耗时与“人抓到的缺陷数 / 总缺陷数”——人的注意力应越来越集中在检查抓不到的地方。
- 单位产出成本：token、模型调用次数、单动作耗时（对照 `orchestration.md` 记录的预算口径）。
- 换件/改需求的代价：改动一处（如换武器、换字段）需要重做多少下游产物——原文的对照是 403 帧 vs 挂骨骼换装，可作为同类工作的类比指标。
