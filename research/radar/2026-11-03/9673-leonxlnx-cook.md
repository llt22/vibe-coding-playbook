# Leonxlnx/cook

- 结论：**值得一试**。先按 README 把 cook 安装为 Claude Code / Codex 的 skill，再用一个只有 2–3 张参考图的小型视觉任务跑 2–3 轮，验证“参考图定标 + 每维分数门槛 + 零上下文评审打分 + 每轮对比图 + 人工只把最终渲染关”这条循环是否真的减少返工。值得试的理由是它给出了可直接复制的安装命令、调用方式、8 步循环、状态目录和对比脚本；不能直接 adopt 的理由是证据只有作者自述的一次高成本 demo（约 $1.8k–2.3k），且场景限于视觉构建。
- 原文：https://github.com/Leonxlnx/cook
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T19:14:00.688Z

## 是什么

cook 是一个面向 Claude Code / Codex CLI 的 agent skill（纯 Markdown + 一个 Node 脚本），把“照着参考图/视频做出高质量视觉成品”这件事固化成一条可长跑的循环，作者称之为 Cook Loop：先做一次性 intake（需求澄清），然后进入一个长时间无人值守的循环：构建 → 在参考镜头位置渲染静帧 → 零上下文 critic 打分 → 修最弱项 → 记录本轮，循环直到成品与参考图匹配。

适用对象（原文列举）：代码实现的 3D 世界、影片、发布视频、游戏、UI。

核心设计有三点：

- 参考图是“最低标准（minimum bar）”，不是灵感来源。
- 每个维度给一个数字门槛，模型自评偏高，所以要用人自己的估分去校准。
- 所有运行状态放在项目的 `cook/` 目录，因此上下文重置或换一个 agent 接手都能续跑。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 1｜环境准备**
前提：需要用 side-by-side 对比脚本。
要求 Node 18+，并且 `ffmpeg` 在 PATH 上。原文说明：其余部分都是纯 Markdown。

**步骤 2｜安装 skill**
前提：使用受 skills CLI 支持的 agent。
```text
npx skills add Leonxlnx/cook
```
手动安装位置：
```text
Claude Code:  ~/.claude/skills/cook
Codex CLI:    ~/.codex/skills/cook
```
调用方式：Claude Code 里 `/cook`，Codex 里 `$cook`。也会被这些说法触发："go cook"、"iterate until it matches"、"match the references 99%"。

**步骤 3｜准备参考素材，并把它们变成镜头清单**
前提：手上已有参考图（原文示例是 9 张）；如果给了运动参考，会逐帧分析。
要求：参考图是下限而非灵感；每张参考图对应一个 shot（镜头），并写明“从这张图里取什么”（构图、光照、颜色、材质、远近细节、运动等）。

**步骤 4｜一次性 intake（之后不再提问）**
前提：你希望 agent 能整夜跑。
两种做法任选：
1) 直接下指令，让 agent 把所有开放问题一次性问完并给默认值：
```text
/cook build this ancient greek world in three.js, match the 9 attached references
```
2) 想要完全控制，就先填写模板再发出去：
```text
templates/brief.md
```
原文关键约束：intake 之后 agent 不再提问，这是它能通宵跑的前提。

**步骤 5｜设门槛（Bar）：每个维度一个数字**
前提：你必须自己先给出估分，用来校准模型自评。
维度示例：composition（构图）、light（光照）、color（颜色）、materials（材质）、detail near and far（远近细节）、motion（运动）。
门槛示例：静帧 99.9%，或视频至少 9/10。
原文明确提醒：模型给自己打分偏高，所以每次评分要用你自己的估计去校准。

**步骤 6｜定规则（Rules）**
前提：在循环开始前写死，避免中途反复。原文给出的默认规则项：
- 默认零外部素材（zero external assets）；
- 声音与素材策略要诚实（honest sound and asset policy）；
- 一份 slop 禁列（ban list）；
- 颜色既不发灰也不过饱和；
- 弱 GPU 上离线渲染。

**步骤 7｜设时间（Time）**
前提：区分 demo 和小任务。
- demo 设时间下限：至少 8h；如果 2h 就做完，说明有问题。
- 小任务设硬上限。
- 做用量节奏控制（usage pacing），避免跑着跑着撞上限额而停摆。

**步骤 8｜跑循环（每轮固定动作）**
前提：参考镜头位置已定义。每轮依次：
1. 构建（build）；
2. 在参考镜头对应的位置渲染静帧（stills）；
3. 与参考图并排对比；
4. 由零上下文 critic 打分（fresh-context critics，新上下文评审，避免自我偏袒）；
5. 修最弱的那一项；
6. 在 `cook/ROUNDS.md` 记录本轮；
7. 重复。

**步骤 9｜人工关卡（Gate）**
前提：你愿意每轮看静帧。
每轮静帧直接推给你、不暂停流程；未获你批准，不渲染最终成片。

**步骤 10｜自己也做一张并排对比图**
前提：步骤 1 的环境已就绪。
```text
node scripts/side-by-side.mjs --out compare.jpg ref1.png render1.png ref2.png render2.png
```
输出：左边参考、右边渲染结果，每个 shot 一行。

**步骤 11｜交付（Ship）**
原文给出的交付细则：首帧作缩略图；最好的场景放最前；画面上不放文字；使用已授权音乐并署名；如果要公开仓库，附上诚实的数字。

**步骤 12｜断点续跑**
前提：保留项目里的 `cook/` 目录。
所有运行状态都在 `cook/` 内，上下文重置后可续跑，也可把这次运行交给另一个 agent。

**仓库内文件结构（原文列出，便于按需展开细节）**
```text
SKILL.md                      the loop the agent follows
references/intake.md          questions, defaults, the brief
references/target-and-bar.md  references, shot list, rubric, calibration
references/loop-and-critics.md rounds, critic prompts, feedback, pacing
references/rules.md           assets, sound, ban list, color, rendering
references/ship.md            final render, video spec, repo, numbers
templates/brief.md            fill-in prompt for your own runs
templates/ROUNDS.md           the round ledger
scripts/side-by-side.mjs      reference left, render right, one row per shot
```

## 对应的研究问题

**1. 能力发现：AI 已能做哪些还没想到交给它的事**
原文把一类工作整体交给 agent：“必须经得起与参考并排比的视觉构建”，包括代码实现的 3D 世界、影片、发布视频、游戏、UI。作者自述的案例是一个古希腊世界（Athenaion），用约 45k 行 JavaScript、55 个子 agent（最多 12 个并行）完成，无人值守长跑约 45 小时。这说明“对着参考图反复迭代直到匹配”这类原本需要人盯的工作，可以整体外包。

**2. 任务匹配：什么工作适合怎样的模型、工具、协作方式**
- 工具：封装为 Claude Code / Codex CLI 的 skill，用 `/cook`、`$cook` 调用；也可被自然语言触发。
- 协作方式：零上下文 critic 独立打分（避免同一上下文自我偏袒）；人只在静帧关卡做审批；`cook/` 状态目录使工作可交接给另一个 agent。
- 工具链：Node 18+ 与 ffmpeg 负责并排对比图；渲染在弱 GPU 上离线进行（案例是集成显卡 AMD Radeon 780M，4K）。
- README 还提到与 unlazy 配合（cook 定目标和门槛，unlazy 保证执行力），并称不依赖 goal / loop / long-run 模式也能工作。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 信息：一次给全——所有开放问题在 intake 阶段一次问完并带默认值；参考图/视频及“每个参考取什么”的镜头清单；每个维度的数字门槛；规则清单（素材策略、禁列、颜色、渲染方式）；时间下限与上限。
- 工具：skills CLI、Node 18+、ffmpeg、可离线渲染的环境。
- 权限：允许它长时间自主运行、允许它自己渲染静帧。
- 反馈：每轮静帧 + 并排对比图 + `cook/ROUNDS.md` 轮次账本；你用自己的估分校准它的自评。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
- 一次性 intake 后不再提问，是它能整夜跑的前提。
- 时间维度：demo 设 8h 下限（2h 就完成视为异常）、小任务设硬上限、用用量节奏控制避免撞限流停摆。
- 状态维度：所有运行状态落到 `cook/`，上下文重置或换 agent 后可续跑。
- 事件维度：每轮渲染静帧后即推送给人工（关卡事件），未批准不渲最终片。

**5. 效果验证：怎样判断确实改善了结果**
- 在参考镜头位置出静帧，与参考图并排比（脚本产出 ref 左 / render 右、每 shot 一行）。
- 每维一个分数门槛（如静帧 99.9%、视频 ≥9/10），并由人的估分校准模型自评。
- `cook/ROUNDS.md` 记录每轮，形成可回看的轮次账本。
- 硬关卡：未获批准不出最终成片。
- 对外可核验：公开仓库时附“诚实的数字”。

## 与已有做法的关系

清单中的 **Claude Code（tool，adopt）** 与本条目直接相关：cook 就是一个 Claude Code skill，手动安装位置为 `~/.claude/skills/cook`，用 `/cook` 调用。也就是说，它是对已有 Claude Code 使用方式的扩展（补上 intake、门槛、critic、轮次账本、人工关卡这套流程约束），不与清单中的条目冲突。

README 中提到的 **unlazy**（用于强化努力程度与完成纪律）不在给定清单内。

## 证据与局限

**原文给出的数据与案例**
- 主案例 Athenaion（古希腊世界，对照 9 张 AI 生成参考图，无外部素材），原文写作由 Claude Opus 5.5 完成：总时长约 45h；55 个子 agent，最多 12 个并行；约 45k 行 JavaScript；约 11M 输出 token；API 等价成本约 $1.8k–$2.3k（实际跑在 Max 套餐上）；4K 渲染在集成显卡 AMD Radeon 780M 上完成。
- 另外列出 4 个同法制作的 demo（Alpine lake、10 Chinese landscapes、Golden temple、Afterglow pianist film），但本材料只有链接和名称，没有它们的任何数据或流程细节。

**哪些只是作者主张**
- “参考图是下限不是灵感”“模型给自己打分太高”“2h 就做完说明有问题”“99.9% / 9/10 这类门槛”都是经验性主张，原文没有给出测量方法、样本量或反例。
- 8h 下限、用量节奏、slop 禁列、颜色“不发灰也不过饱和”等规则，属于作者口味与经验，未说明依据。
- 案例数字全部为作者自述，无第三方复现、无与“不用 cook”的对照基线，也没有“成品是否被外部认可”的客观指标。

**适用条件与限制**
- 目标场景是视觉构建（3D 世界、影片、视频、游戏、UI），并且你手上确实有可对照的参考图/视频；纯文本或没有参考物的工作不适用。
- 需要 Node 18+ 与 ffmpeg；视频类参考需要逐帧分析，成本更高。
- 成本量级高：案例的 API 等价成本约 $1.8k–$2.3k、11M 输出 token、45h 无人值守。小任务必须自己设硬上限。
- 本材料只到 README 层面：critic 的具体提示词、rubric、intake 问题清单都在 `references/` 下的文件里，原文没有展开；要真正照做，需要打开仓库那几个文件。
- 门槛分数（99.9%、9/10）本身由 critic 给出、由人校准，主观性强，“达到 99.9%”不等于客观质量。

## 怎么试、怎么验证

**最小试用方式**
1. 选一个小任务：一个场景/一个界面，配 2–3 张参考图（不要一上来就上 9 张参考 + 45h）。
2. 按步骤 1–2 装好 skill，填一份 `templates/brief.md`，只跑 **2–3 轮**，把时间上限压到远低于 8h 的 demo 下限（8h 下限只适用于作者定义的 demo 场景，小任务按原文“小任务设硬上限”处理）。
3. 每轮结束收静帧、并排对比图、`cook/ROUNDS.md` 记录；你自己独立给每维打一次分，用来对照 critic 打分。
4. 中途做一次人为的上下文重置，看它能否从 `cook/` 续跑（这是原文明确承诺的能力）。
5. 对照基线：同样的 brief 和参考图，用一次普通提示（不带这套循环）跑一遍，把两者产出并排比较。

**判断是否改善的指标**
- 收敛性：`ROUNDS.md` 里最弱维度的分数是否逐轮上升；达到你设定的门槛需要几轮。
- 人工返工量：最终交付前你自己动手改的比例或次数（对照基线同样统计）。
- 偏差项数量：并排图上构图/光照/颜色/材质/远近细节/运动的明显不一致处，每轮计数。
- 成本：耗时、token、API 等价花费，对比“人工自己做到同一水平”的耗时与成本（案例的 $1.8k–$2.3k 是上限参考，不是小任务的预期）。
- 关卡有效性：你有没有在某轮因为静帧不合格而打回；打回后下一轮是否改对了那一项。
- 续跑可靠性：上下文重置后是否丢状态、是否重复已完成的工作。

**判定标准（建议）**
在你预设的轮数上限内达到自己设定的门槛、且人工返工量明显低于基线，就把它固化为常规流程；如果 2–3 轮内分数不涨或主要靠你手工修，就降级为 study，只借其“一次性 intake + 每维门槛 + 零上下文 critic + 轮次账本 + 人工关卡”的结构，而不使用这个具体 skill。
