# 让 agent 交付前拿出证据：数值判断交给脚本，复查交给独立模型，标准由人类终审迭代

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么让 agent 的“已完成”从一句声称变成一条可检查的链路：可重建的 spec 或抓帧契约、脚本判定的数值关卡、独立模型对照历史缺陷清单的复查、人类终审并把漏网缺陷固化成新检查。
> 先试这一步：在让 agent 产出第一件东西之前，先写下抓帧或测量契约（字段与阈值），并跑通校验脚本自身的测试——先确认“尺子”可用，再开始量。
> 最近修订：2026-11-12

## 解决什么问题

让 agent 的“完成”不再是一句声称，而是一条可检查的链路：先把任务写成可重建的 spec 或抓帧契约，先读测量事实再做渲染，由脚本而不是模型来判数值，用独立模型对照历史缺陷清单复查特写，人类终审并把漏网缺陷固化成新检查，最后独立验证真正交付出去的文件，并把未解决缺陷列清楚。

## 适用与不适用

**适用**

- 产出型任务，且中间结果可以反复生成并客观比对：CAD 零件、3D 打印件、渲染图、截图、2D 骨骼动画的逐帧抓帧、测试输出、导出文件。
- 任务有可写死的硬约束：尺寸、壁厚、体积、格式、接口、朝向，或者滑步像素、地面速度这类能从抓帧里量出来的数。
- 你手上有人类历史上抓到过的缺陷清单，或愿意在试用中积累——这是做法 C 的核心输入。
- 你愿意在开工前写验收口径或抓帧契约，并接受“先做样件再扩展”。

**不适用，或不要照抄**

- 没有可观察反馈、拆不出样件、也无法抓帧测量的任务，这套闭环跑不起来。
- 艺术类任务不能只用测量代替判断；测量通过不等于艺术被接受，三个来源都各自承认这一点。
- 本手册依据的是三份 README / 仓库级材料，不是独立基准测试。Atta 项目很小；Blender 资产技能仓库只有 35 stars；spine-hero 只在单一 2D 骨骼动画项目上验证过。都只适合试点，不适合直接当组织标准。
- spine-hero 的“从彩绘到 rig”构建脚本和抓帧脚本都未随仓库提供，只给了方法说明与契约；指望装个技能就出动画会落空。
- 原文没有给出按时间或外部事件自动触发的机制；能自动推进的是状态触发，例如 verify 不过则 deliver 拒绝、关卡 FAIL 则回退作者。不要指望它自己定时跑。

## 前置条件

- **做法 A（Atta，测量优先）**：Python ≥ 3.10；有 git；核心依赖 numpy、scipy、trimesh、manifold3d、pillow。只有预览和 GLB/BLEND/OBJ/STL 导出需要 Blender；解析式 STEP 导出需要 `.[brep]` 扩展。
- **做法 B（Blender 资产，视觉验收优先）**：本机已安装 Blender；agent 中已配置 Blender MCP；Codex 版按需准备图像生成器；有 git。仓库明确声明不安装 Blender、MCP server 或图像生成器。跑诊断脚本还需要 Pillow 和 Blender 可执行文件路径。
- **做法 C（spine-hero 三层校验）**：原文明确列为“你必须自备”——一张完成度足够、侧视、静止姿态的主角彩绘；一个 Spine 风格的骨骼运行时（原项目用 Spine 4.2 + PixiJS 官方运行时）；一个“从彩绘到 rig”的构建方式（构建脚本未随仓库提供，`references/rig.md` 只描述方法，也可在 Spine 编辑器里手搭）；一个能从你的引擎抓帧的脚本（逐帧播放、无光照与有光照各渲一遍、测量、写出 `metrics.json`，同样未随仓库提供，`references/gate.md` 只给契约）；Node 18+；可选 image-to-video 模型和图像模型；一个编码 agent，理想情况能起子 agent。
- **做法 D（无上述环境）**：任务能稳定产出可观察的中间结果，并且有一份可对照的目标参考加 2–3 条能写死的硬约束。
- **四种做法都需要**：开工前把验收口径或抓帧契约写下来；把工作产物写成可重建的 spec 或参数文件，而不是只留最终文件；一个能跑校验脚本的环境（Python 或 Node）。

## 操作步骤

**先选做法**

- 交付物是有尺寸、壁厚、体积、公差等可测量判据的零件或 3D 打印件 → 走做法 A。核心是“先测量后渲染”。
- 交付物是视觉资产，艺术接受度是主判据，且已有 Blender + Blender MCP → 走做法 B。核心是“样件 → 比对 → 修复 → 复检 → 三类验收”。
- 产出可以逐帧或逐版本抓帧测量，并且你有一份人类历史缺陷清单 → 走做法 C。核心是“脚本判数值、独立模型查清单、人类终审回灌”。
- 都不适用或没有环境 → 走做法 D，只借共同骨架。

做法 C 的三层结构可以叠加到 A 和 B 上：A 的 `verify`、B 的导出验证都相当于第一层脚本关卡；再给独立复查准备一份历史缺陷清单，并让人类终审结果回流成新检查。这个叠加是本次调研提出的试点方向，三个来源都没有这样组合过。

### 做法 A：Atta，先测量后渲染

1. **安装 Atta。** 前提：有 git 与 Python ≥3.10。预期：`pip install -e .` 成功，后续可用 `python3 -m atta`。

```bash
git clone https://github.com/laszapens/Atta.git atta && cd atta
python3 -m venv .venv && . .venv/bin/activate
pip install -e .
```

可选扩展：

```bash
pip install -e ".[brep]"   # 解析式 STEP 导出（build123d / OpenCASCADE）
pip install -e ".[dev]"    # pytest + jsonschema
```

2. **先自检再干活。** 前提：已完成第 1 步。预期：看到环境与能力自检结果，以及 23 个 recipe、25 个算子的参数 schema。

```bash
python3 -m atta doctor --deep
python3 -m atta catalog --verbose
```

3. **用现成 recipe 出草稿，先只读测量事实，不先看渲染。** 前提：第 2 步通过。预期：拿到 model_id、bbox、体积、拓扑、壁厚、射线、ASCII 截面和一个 verdict。`describe` 是事实，`render` 是判断，不要反过来。

```bash
python3 -m atta model --recipe product.mug
python3 -m atta describe --wall
python3 -m atta perceive --res 24
python3 -m atta verify --level standard
```

4. **给 agent 用时统一加 `--json`。** 预期：拿到 `{ok, data, error}` 信封；人类视图不带这个结构。后续动词默认使用最近一个 `model_id`，不必手动传。

5. **换成 spec 驱动，让模型可重建。** 前提：你知道要改哪些参数。预期：同一份 spec 复现同一 geometry hash；`model_id` 存的是“怎么重建”，不是网格 blob。

recipe 形态最短路径：

```json
{
  "schema": "atta.spec/v3",
  "name": "mug-01",
  "model": {"kind": "recipe", "id": "product.mug", "preset": "nominal",
            "params": {"height": 95, "wall": 3.2, "handle_enabled": true}},
  "quality": "draft",
  "material": "ceramic",
  "finish": {"bevel_mm": 0.6, "smooth_deg": 35},
  "constraints": {"bbox": {"z": [80, 120]}, "min_wall_mm": 2.4}
}
```

```bash
python3 -m atta model --spec-file examples/mug/spec.json
```

需要算子 DAG 时用 graph 形态，参数一律 mm，支持 `{"$param": "w"}` 与 `{"$expr": "w/2 + 4"}`。示例 spec 在 `examples/bracket/spec.json`，跑法：

```bash
python3 -m atta model --spec-file examples/bracket/spec.json
python3 -m atta deliver --formats step
```

6. **只有 verdict 为 `pass` 才产出文件。** 前提：要 Blender 的格式需 Blender 在 PATH，或用 `ATTA_BLENDER` 指定具体 build。预期：`deliver` 拒绝一切非 `pass`；`degraded` 需显式 `allow_degraded=true`；`preview` 没有退路，没有 Blender 就直接报错，此时改用 `describe --perceive`。

```bash
python3 -m atta preview --mode studio --views hero --res 1200
python3 -m atta deliver --formats glb,obj,stl
```

无 Blender 时 `deliver` 会降级而不是崩溃：仍会 verify 并写 manifest，未导出格式逐条标 `blender_unavailable` 并给 `fix`。不要把这个降级当成正常交付。

7. **接 agent 时优先 MCP，必要时才用 HTTP 桥。** 前提：宿主支持 MCP。预期：生成的配置使用绝对路径，装完重启宿主才加载 `atta_*` 工具。

```bash
python3 -m atta.agent.install claude
python3 -m atta.agent.install cursor
python3 -m atta.agent.install zcode
python3 -m atta.agent.mcp
```

每条生成的配置都用绝对路径：`python -m atta.agent.mcp` 配 `cwd`、`ATTA_ROOT`、`PYTHONPATH` 指向该 checkout。

HTTP 桥仅回环、无鉴权，是本地 agent 桥不是网络服务，不要暴露端口：

```bash
python3 -m atta.agent.http --port 8765

curl -s localhost:8765/health
curl -s localhost:8765/tools
curl -s "localhost:8765/manifest?format=openai"
curl -s -X POST localhost:8765/call -H 'content-type: application/json' -d '{"tool":"atta_model","args":{"recipe":"product.mug"}}'
```

8. **隔离工作区。** 预期：状态（`models.json`、preview、导出）落在 `$ATTA_HOME/_atta/`，默认当前目录；把 `ATTA_HOME` 指到项目目录，并把 `_atta/` 加进该项目的 `.gitignore`。宿主插件 `import atta` 失败时设 `ATTA_PYTHON` 指向 venv 解释器；checkout 搬家时设 `ATTA_ROOT`。

9. **读错误，不打补丁式重试。** 预期：每条失败都带 `code`、`path`、`fix`；按 `fix` 改 spec 再重建，而不是重复同一调用。
   - `status: "repaired"` = 参数越界被夹紧，必须读 `applied_patches` / `issues`，你拿到的不是你要的模型。
   - `deliver` 返回 `status: "blocked"` = verify 未过，按 `verify.issues` 首条的 `fix` 改后重建；`degraded` 需显式 `allow_degraded=true`。
   - `unknown_recipe` 的 `fix` 会列出 23 个合法 id；`no_models` 多半是 `ATTA_HOME` 指错地方。

10. **交付前做独立验证。** 预期：`verify` 为 `pass`，`deliver` 有 manifest；把导出的文件重新打开或重新读入，核对尺寸、朝向、格式、材质/单位有没有丢。不要只检查工作副本。

### 做法 B：Blender 资产，视觉验收优先

1. **自备运行环境。** 前提：Blender 已安装、agent 里的 Blender MCP 已配置好。预期：agent 能通过 MCP 操作 Blender；仓库本身不会帮你装这些东西。

2. **把技能装进 agent 的 skills 目录。** 前提：目标位置已有同名技能时，先保留现有版本或换位置。预期：技能可被调用。

```bash
git clone https://github.com/new-experement/blender-asset-studio.git
cd blender-asset-studio
```

```bash
mkdir -p ~/.codex/skills
cp -R codex/blender-asset-studio ~/.codex/skills/
```

```bash
mkdir -p ~/.claude/skills
cp -R claude-code/blender-asset-studio ~/.claude/skills/
```

若使用自定义 `CODEX_HOME`，改装到它的 `skills` 目录下。

3. **调用技能，并附上参考图。** 预期：进入“任务澄清 → 参考素材输入 → 视觉方向选择”的开头。

```text
$blender-asset-studio Create a model from the attached references.
```

```text
/blender-asset-studio Create a model from the attached references.
```

4. **先做一个有代表性的样件并通过，再扩展到整个资产。** 前提：任务已澄清、参考素材已给足。预期：尺寸、比例、朝向这类最容易返工的问题先在样件上暴露，而不是整件做完才发现。

5. **对照目标做两遍比对：整体一遍，对应区域一遍。** 预期：说得出“哪里不一样”，而不是“看着还行”。

6. **把缺陷改写成可量化的修复项，改完必须看新渲染结果。** 预期：每条修复都能对应到一张新渲染图；不要凭想象认为已经改好。

7. **做结构性核对：可见性、支撑/接触、非预期穿插、操作间隙。** 预期：这几类问题被单独过一遍，不被“整体看着不错”掩盖。

8. **跑仓库自带的诊断脚本（Codex 包）。** 前提：已装 Pillow，并知道 Blender 可执行文件路径。预期：拿到几何与交叉检查的技术输出；注意脚本在独立后台进程里建临时 fixture，不连真实 Blender 场景。

```bash
cd codex/blender-asset-studio
python3 scripts/test_helpers.py --blender /path/to/blender
python3 scripts/test_geometry_audit.py --blender /path/to/blender
python3 scripts/test_intersections.py --blender /path/to/blender
```

9. **分三件事验收，不要合成一件：艺术接受度、源文件技术检查、导出验证。** 预期：导出后再单独做一遍导入验证——能否正常导入、尺寸与朝向是否正确、是否仍是可编辑网格、材质有没有丢失。

10. **修复预算耗尽就停：保留最佳候选，并列出未解决缺陷。** 预期：交付里带一份“还差什么”的清单，而不是一句“已完成”。

### 做法 C：spine-hero 式三层校验

三层分别是：脚本关卡判数值、独立模型按历史缺陷清单复查特写、人类终审并把漏网缺陷固化成新检查。原项目只在一套 2D 骨骼动画上验证过，把它当结构样本用，不要当通用解决方案。

1. **先定抓帧契约，再写第一个动作。** 前提：还没有任何动作产出。预期：`metrics.json` 的字段与阈值定下来，后面关卡与复审都读它。原文明确：“没有它，任何东西都无法被关卡判定或被复审。”照 `assets/metrics.example.json` 与 `references/gate.md` 定义字段。

2. **安装 skill。** 前提：已按前置条件自备运行时与抓帧脚本。预期：技能可被调用，Claude Code 里名为 `/spine-hero`。

```text
/plugin marketplace add enoch3712/spine-hero-skill
/plugin install spine-hero@spine-hero-skill
```

或从 shell：

```sh
claude plugin marketplace add enoch3712/spine-hero-skill
claude plugin install spine-hero@spine-hero-skill --scope user
```

也可直接拷贝文件夹：

```sh
git clone https://github.com/enoch3712/spine-hero-skill.git
mkdir -p ~/.claude/skills
cp -R spine-hero-skill/skills/spine-hero ~/.claude/skills/        # 所有项目
# 或：cp -R spine-hero-skill/skills/spine-hero <project>/.claude/skills/   # 单个项目
```

Codex 用软链接到它读取的目录：

```sh
git clone https://github.com/enoch3712/spine-hero-skill.git
mkdir -p ~/.agents/skills
ln -s "$PWD/spine-hero-skill/skills/spine-hero" ~/.agents/skills/spine-hero     # 所有项目
```

Cursor 会读 `.claude/skills/`、`.cursor/skills/`、`.agents/skills/` 及其家目录版本，因此上面任一份拷贝或链接对 Cursor 同样生效——但“把文件夹拷进去算安装”原文标注为推断，Cursor 的插件安装路线未测试。

3. **先跑通关卡本身，不涉及你的美术资产。** 前提：Node 18+。预期：测试通过，示例 metrics 得到 `PASS example-hero walk: 8/8 checks`。这一步验证的是脚本，不是你的资产。

```sh
node --test skills/spine-hero/scripts/gate.test.mjs
cp skills/spine-hero/assets/metrics.example.json /tmp/metrics.json
node skills/spine-hero/scripts/gate.mjs /tmp/metrics.json
```

4. **编排：每个动作一份 brief、一个 run。** 预期：动作并行构建；多作者同时构建时，用 `scripts/with_lock.sh` 在共享锁下跑“构建 + 关卡”；只有一个 agent 时，按 `references/orchestration.md` 把各角色当作分开的 pass 依次跑。

5. **参考视频只取节奏。** 前提：有 image-to-video 模型，或用 `references/reference-video.md` 的模板手写 beats。预期：触地帧、过渡帧、步时、摆高读进 beats 文件（如 `walk-beats.json`）。原文明确：绝不描摹、绝不当帧用。

6. **补画彩绘从未展示的部分。** 预期：被遮挡部位（如远侧手臂）、新装备（斧、锤、塔盾）、快速打击的关键姿势都有参考。图像模型以彩绘为参考补画。

7. **把动作写成代码并自检。** 前提：rig 已就绪。预期：强编码模型在 rig 上用关键帧和 IK 写出该动作，构建、抓帧、看自己的结果。

8. **过关卡：数值判定，模型不参与。** 前提：已有该次抓帧的 `metrics.json`。预期：拿到 PASS/FAIL 与逐项数值；FAIL 时按 `references/locomotion.md` 对应条目改，再复跑。

```sh
node skills/spine-hero/scripts/gate.mjs out/walk/try1/off/metrics.json --kind walk --limits my-gate-limits.json
FAIL example-hero walk: 7/8 checks | slidePxMax=3.1 (limit {"max":2})
```

阈值文件用 `scripts/gate-limits.json` 起步，但它只在一种抓帧尺寸上校准过，换尺寸要按 `references/gate.md` 重设哪些可平移、其余如何重设。失败示例的改法：脚跟着地 + 地面剥离被判为脚底骨滑步 → 改为脚掌平落、剥离放到空中 → 复跑得到 `PASS example-hero walk: 8/8 checks`。

9. **独立模型按历史缺陷清单复查。** 前提：有关卡结果与接触表（sheets）。预期：中端模型先复审 `gate.json` 与接触表；再由一个与作者分离的独立模型，在 2 倍脚部与头部特写上逐条过 `defects.md`（原文收录 13 条人类抓到、自动检查漏掉的缺陷），命中就回给作者修，然后关卡、复审、检查三道全部重跑。

10. **人类终审，并把漏网缺陷固化。** 预期：orchestrator 自己看图、把视频给人看；人抓到的每个问题写成 `defects.md` 的第 N 行，或加成一条新的关卡检查。这是闭环的关键一步，不是可选装饰——验证标准本身随使用增长。

**三态闸门与布尔关卡不冲突。** Atta 的 `pass / degraded / fail` 用来决定“能不能交付”，`degraded` 必须显式放行；spine-hero 的关卡只有 PASS/FAIL，但逐项给出数值与阈值，用来告诉作者“改哪里”。两者可以并用：布尔关卡驱动修复循环，三态闸门做交付决策。

### 做法 D：没有上述环境，只借共同骨架

原文没有给通用提示词，下面是把三种做法的共同骨架映射到其他产出型任务的写法，不是可以照抄的步骤原文：

1. **先把验收口径拆成三栏写下来**：谁来判“可接受”、中间产物或源文件的技术检查、最终交付物的验证。预期：三栏各自有结论，任何一栏都不能替代另一栏。
2. **把“技术检查”这一栏尽量做成脚本判定的数值关卡。** 预期：每条判定都有数值和阈值，失败时能指出是哪一项、差多少，而不是让模型自己说通过。
3. **写死 2–3 条可测量的硬约束和一份参考**（尺寸、格式、范围、接口这类能判定的东西）。预期：后面每一轮比对都有同一把尺子。
4. **把工作写成可重建的 spec 或参数文件，并记录版本/哈希。** 预期：同一份输入能复现同一结果；不要只让 agent 直接改最终文件。
5. **先做一个代表性样件并通过，再扩展。** 预期：最贵的返工发生在样件阶段，而不是收尾阶段。
6. **先读测量事实，再看渲染/截图；整体比对与局部比对各做一遍。** 预期：能指出具体差异在哪，而不是“看着还行”。
7. **把缺陷变成可量化的修复项，改完重新生成并看新结果。** 预期：每一步修复都有对应的新产出作证。
8. **让一个与作者分离的模型对照历史缺陷清单复查特写。** 预期：查出来的是“第几条”，不是“看起来还行”；没有清单就先积累。
9. **用三态闸门收口：`pass` 才交付，`degraded` 必须显式说明并人工确认，`fail` 不交付。** 预期：交付说明里的状态和证据能对上。
10. **独立验证真正交付出去的那份文件**（不是工作副本）。预期：交付物在目标环境里能打开、参数正确、内容没丢。
11. **人类终审，并把每个新缺陷固化成清单一行或一条新检查。** 预期：同类缺陷下一轮不再出现；回灌率应为 100%。
12. **结束时报未解决缺陷；预算耗尽即停并保留最佳候选。** 预期：交付说明里报出的问题，能和人工查出的清单对得上。

## 怎么判断变好了

**最小试用（半天到一天量级）**

- **做法 A**：用 `product.mug` recipe 跑一遍 `model → describe → verify → deliver`，记下测量事实与 verdict；再改一个参数重跑，看 geometry hash 是否变化、约束是否仍然过。然后用一个你自己的小零件跑同样流程。
- **做法 B**：选一个小而完整的资产——原文的建议是一张带桌腿接触、有明确尺寸的桌子；准备 2–3 张参考图，并写下尺寸、朝向、导出格式三项硬约束；走至少 2 轮“样件 → 比对 → 修复 → 复检”。
- **做法 C**：先用示例 `metrics.json` 跑通关卡，确认 `PASS 8/8`；再故意把一个值改到越界，看它是否给出带数值的 FAIL 判定。然后用自己的一个小动作走至少 2 轮“抓帧 → 关卡 → 改 → 复跑”，中间让独立模型过一遍 `defects.md`，最后自己看一遍并记下抓到的新缺陷。
- **基线对照**：同样的参考图和约束，用普通对话直接让 agent 生成，不走这套闭环。
- 导出后做导入验证。

**试用前先定阈值，盯这几个指标**

- 达到“可接受”所需的修复轮次（越少，说明自检越有效）。
- 人工返工项数，尤其是“agent 声称已修好但实际没修”的次数（虚假通过率）。
- 导出失败率、导入后仍需手工修的比例。
- 盲评接受度（不看是谁做的，由人打分）；艺术类任务不能只靠测量。
- 未解决缺陷清单的完整度：agent 报出的缺陷与人工查出的对不对得上。这一项最能区分“自检真在工作”和“自检在表演”。
- 测量先行指标：第一次看渲染/截图之前，是否已经拿到 `describe` / `perceive` 的测量事实；`verify` 的 `pass / degraded / fail` 分布；`deliver` 被 `blocked` 的次数与原因；`repaired` 次数（参数被夹紧说明你拿到的不是你要的模型）；同一 spec 重跑的 geometry hash 是否一致。
- 关卡逐项数值的趋势（例如 `slidePxMax` 是否在逼近阈值），而不只是 PASS/FAIL 的总数。
- 独立模型对照 `defects.md` 的命中条数。命中多不一定是坏事，说明复查在工作；如果长期为 0 而人类终审仍在抓缺陷，说明复查在表演。
- 人类终审新发现的缺陷条数，以及其中被固化成清单行或新关卡检查的比例（回灌率应为 100%）。
- 回灌之后同类缺陷的回归率。

**停手条件**：跑满两轮后，如果虚假通过率仍然高，或修复轮次与基线没有差别，就把它降级为“只借流程结构”，不要当工具推荐。

## 常见坑

- **先看渲染再读测量。** 渲染是判断，不是证据；Atta 的原则是事实先于像素。先跑 `describe` / `perceive`，再决定要不要渲染。
- **让模型来判数字。** spine-hero 的关卡是纯 Node、无依赖脚本，明确“没有模型来判这些数字”；模型参与判定就等于自证。
- **没先写 `metrics.json` 契约就开始做第一个动作。** 原文说得很直接：没有它，任何东西都无法被关卡判定或被复审。
- **把 `model_id` 当网格 blob，不保存 spec。** 那样不可复现；同一 spec 应复现同一 geometry hash。
- **忽略 `status: "repaired"`。** 参数被夹紧后，你拿到的不是你要的模型；必须读 `applied_patches` / `issues`。
- **对 `blocked` 做补丁式重试。** 按 `verify.issues` 首条的 `fix` 改后重建，而不是重复同一调用。
- **不声明 `degraded` 就交付。** `deliver` 拒绝非 `pass`；`degraded` 需显式 `allow_degraded=true`，不能偷偷绕过。
- **把 HTTP 桥暴露到公网。** 它仅回环、无鉴权，是本地 agent 桥，不是网络服务。
- **`no_models` 时乱改 spec。** 多半是 `ATTA_HOME` 指错地方。
- **把阈值跨抓帧尺寸照抄。** `gate-limits.json` 只在一个抓帧尺寸上校准过，换尺寸要按 `references/gate.md` 重设。
- **把参考视频当帧描摹或直接当帧用。** 它只提供时序与节拍；原文对此是明令禁止。
- **用同一个模型做“独立”复查。** 复查模型必须与作者分离，否则等于自证。
- **人类终审发现的缺陷不回灌。** 不写成 `defects.md` 新行或新关卡检查，闭环就断了，下一轮还会犯同一个错。
- **把 `gate.test.mjs` 通过当成关卡对你的资产有效。** 它验证的是脚本自身，不是你的动作。
- **以为仓库会给你 rig 构建脚本和抓帧脚本。** spine-hero 两者都未提供，只有方法说明与契约。
- **把脚本通过当成资产可用。** 自带测试只创建临时 fixture、在独立后台进程里跑，不连真实 Blender 场景，脚本通过不等于真实资产可用。
- **把“接触上了”当成“没有穿插”。** 原文明确说接触不能证明没有穿插；采样也不能保证检出所有碰撞；保存的单帧无法验证整段运动。
- **以为诊断脚本会自动修复。** 它不会，修复仍要靠下一轮去改。
- **把技术通过当成艺术接受。** 原文自己承认“技术有效不等于艺术上被接受”。
- **跳过样件，直接做整件。** 返工成本最高的地方暴露得最晚。
- **改完不看新渲染。** 凭想象认为改好了，是“虚假通过”的主要来源。
- **预算耗尽后含糊收尾。** 正确做法是保留最佳候选并列出未解决缺陷。
- **三类验收混在一起做。** 艺术、源文件技术、导出验证混着看，任何一类的问题都会被另一类的“还行”盖住。
- **不做基线对照。** 没有对照就没有“变好”，只有“感觉好”。
- **误以为仓库会帮你装环境。** Atta 的 Blender 后端、Blender 资产仓库的 Blender/MCP server/图像生成器、spine-hero 的运行时与抓帧脚本，都要自备。

## 证据与来源

- **做法 A 的安装、`doctor` / `catalog` / `model` / `describe` / `perceive` / `verify` / `preview` / `deliver` 命令、recipe 与 graph 两种 spec 示例、MCP 安装命令、HTTP 桥、`ATTA_*` 环境变量、错误码与 `fix` / `applied_patches` 行为**：来自 `laszapens/Atta` 的 README。项目本身很小，没有独立性能证据，只适合试点。
- **“事实先于像素、spec 即模型、三态闸门、错误即补丁”四条原则**：来自 Atta README，是作者的设计主张；原文给出的 `describe` 输出样例和“有/无 Blender 各哪些动词可用”的能力矩阵是支撑，但没有第三方基准。
- **`describe` < 0.3 s、`model` “well under a second”、10 tools / 23 recipes / 25 feature ops 的覆盖量**：均为作者主张，不是实测数据。
- **做法 B 的安装与调用命令、两套适配目录（Codex v1.3.0 / Claude Code）、三个诊断脚本及其依赖（Pillow、Blender 路径）、MIT 许可**：来自 `new-experement/blender-asset-studio` 的 README。仓库 35 stars，是弱信号。
- **“先做代表性样件 → 整体与区域比对 → 可量化修复并检查新渲染 → 可见性/支撑接触/穿插/间隙检查 → 艺术、源文件、导出三类验收 → 预算耗尽保留最佳候选并列出未解决缺陷”这套七步流程**：直接来自该 README 列出的使用流程。
- **“脚本通过 ≠ 真实资产可用”“接触不能证明无穿插”“采样不保证检出所有碰撞”“单帧不能验证整段运动”“诊断不自动修复”“技术有效不等于艺术被接受”**：均为原作者的自我限定，属于作者主张，不是实测数据。
- **“视觉参考评审、可量化修复、间隙检查有效”**：作者主张，原文没有质量对比、成功率、前后差异数据或案例截图支撑。
- **做法 C 的插件与拷贝安装命令、`gate.mjs` 与 `gate.test.mjs` 用法、`with_lock.sh`、`references/` 各文件分工、`metrics.example.json` 得到 `PASS example-hero walk: 8/8 checks`、失败样例 `FAIL ... 7/8 checks | slidePxMax=3.1 (limit {"max":2})`、`defects.md` 收录 13 条**：来自 `enoch3712/spine-hero-skill` 的仓库与说明。这些是可复跑的命令与真实输出，属于该项目的可核证据。
- **“旧方案 10 个片段、403 帧、换武器全部重做；新方案一张彩绘上骨架、装备挂骨骼可替换”这组新旧对照**：来自同一份材料，是该项目内部对照，不是跨项目基准。
- **“三层校验可迁移到其他可被程序测量的任务”**：是本次调研提出的建议，不是原文结论；spine-hero 只在单一 2D 骨骼动画项目上验证过。
- **rig 构建脚本与抓帧脚本未随仓库提供、`references/rig.md` 与 `references/gate.md` 只给方法与契约**：原文明确说明，属于必须自备的部分。
- **Cursor 插件安装路线未测试、“拷文件夹算安装”为推断、Codex 命令行插件安装与 marketplace 条目未确认、`~/.agents/skills/` 与软链接为文档确认**：原文自己标注了确认程度，不要当成已验证的安装路径。
- **模型档位（Claude Opus 5.5 / Sonnet 5.5、规划用 Fable 5.2）**：是原项目当时所用，不是要求；同档位模型即可。
- **做法 D 的结构映射、最小试用设计与虚假通过率、修复轮次、测量先行指标、回灌率与回归率**：是本次调研提出的试用建议，原文未提供这些数据，阈值需要你在试用前自己定。
- **ZCode 的冲突**：清单把 ZCode 标为 avoid，而 Atta 提供 ZCode 原生集成；这不构成采用 Atta 的前提，试用优先走 Cursor MCP 或 HTTP 桥。
- **原文没有给出的东西**：没有任何时间、事件或状态触发的自动运行机制；唯一涉及状态的是“verify 不过则 deliver 拒绝”“参数越界自动夹紧并标记 repaired”“关卡 FAIL 回退作者”这类状态触发。Blender 资产仓库与 spine-hero 都没有定时调度机制，需要人发起。

## 依据的调研

- [new-experement/blender-asset-studio](../research/radar/2026-10-21/5564-new-experement-blender-asset-studio.md)：值得一试，已配置 Blender MCP 的团队可以把它装成 Codex/Claude Code 技能小范围试用，重点照搬“先做代表性样件→渲染比对→可量化修复→复检→独立导出验证”的闭环；没有 Blender 环境则只借鉴这套自检结构，因为原文只给了安装命令和功能清单，没有可脱离仓库复用的完整流程与提示词。
- [laszapens/Atta](../research/radar/2026-11-09/11811-laszapens-atta.md)：值得一试，建议小范围试用：把 Atta 装起来，在 CAD/3D 打印类任务上完整跑一遍，并把它「先量后渲染、spec 即模型、三态闸门、错误即补丁」这四条做法迁移到其他需要精确性和校验的 LLM 任务；理由是原文给出了可直接执行的安装、CLI、spec 与 agent 接入步骤，但项目本身很小、没有独立性能证据，只适合试点而非直接采用。
- [enoch3712/spine-hero-skill](../research/radar/2026-11-12/12869-enoch3712-spine-hero-skill.md)：值得一试，建议小范围试：把它“脚本化关卡（用数值硬门槛判定）+ 独立模型按历史缺陷清单复查 + 人类终审回灌成新检查”的三层校验，移植到一个产出可被程序测量的任务上；整套 spine-hero 只在单一 2D 骨骼动画项目上验证过，且建模与抓帧脚本要自己写，不宜整体照搬。
