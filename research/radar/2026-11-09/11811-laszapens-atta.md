# laszapens/Atta

- 结论：**值得一试**。建议小范围试用：把 Atta 装起来，在 CAD/3D 打印类任务上完整跑一遍，并把它「先量后渲染、spec 即模型、三态闸门、错误即补丁」这四条做法迁移到其他需要精确性和校验的 LLM 任务；理由是原文给出了可直接执行的安装、CLI、spec 与 agent 接入步骤，但项目本身很小、没有独立性能证据，只适合试点而非直接采用。
- 原文：https://github.com/laszapens/Atta
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T07:00:22.345Z

## 是什么

Atta 是一个「为让语言模型驱动而建」的参数化 CAD 内核：把零件写成一个可重建的 spec，由确定性 Python 算出几何并**测量**，只有测量过关才允许存在渲染或导出。十个工具（统一 `atta_` 前缀）、23 个 recipe、25 个特征算子；Blender 只是可选后端，几何、事实、校验、感知全用 numpy。

四条设计原则是这条线索真正的迁移价值：

- **事实先于像素**：`describe` 在 0.3 s 内返回 bbox、体积、拓扑、壁厚、射线、ASCII 截面；render 是判断，永远不是证据。
- **spec 即模型**：`model_id` 存「怎么重建」，不是网格 blob；同一 spec 复现同一 geometry hash。
- **三态闸门**：`verify` 返回 `pass` / `degraded` / `fail` 并带回执，`deliver` 拒绝一切非 `pass`（`degraded` 需显式 override）。
- **错误即补丁**：每个失败都带 `code`、`path` 和具体的 `fix`，而不是一句道歉。

## 具体做法

前提：Python ≥ 3.10；核心依赖 `numpy`、`scipy`、`trimesh`、`manifold3d`、`pillow`。只有预览和 GLB/BLEND/OBJ/STL 导出需要 Blender。

1. 安装（前提：有 git 与 Python ≥3.10）

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

2. 先自检再干活（前提：已完成第 1 步）

```bash
python3 -m atta doctor --deep                 # 环境与能力自检
python3 -m atta catalog --verbose             # 23 个 recipe、25 个算子的参数 schema
```

3. 用现成 recipe 出草稿，然后**只读测量事实、不先看渲染**

```bash
python3 -m atta model --recipe product.mug    # 打印 model_id
python3 -m atta describe --wall               # bbox / 体积 / 拓扑 / 壁厚
python3 -m atta perceive --res 24             # 文本/ASCII 取景器，不用等渲染
python3 -m atta verify --level standard       # pass / degraded / fail
```

后续动词默认使用最近一个 `model_id`，不必手动传。

4. 任何命令加 `--json`，拿到 `{ok, data, error}` 信封——这是给 agent 用的形态；人类视图不带。

5. 换成 spec 驱动。`recipe` 形态（最短路径）：

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

6. `graph` 形态：算子 DAG，参数一律 mm，支持 `{"$param": "w"}` 与 `{"$expr": "w/2 + 4"}`：

```json
{
  "schema": "atta.spec/v3",
  "name": "bracket-01",
  "model": {
    "kind": "graph",
    "output": "cut",
    "features": [
      {"id": "plate",  "op": "box", "args": {"size": [80, 50, 6]}},
      {"id": "hole",   "op": "cylinder", "args": {"radius": 4, "height": 20, "center": [14, 25, 3]}},
      {"id": "cut",    "op": "difference", "inputs": ["plate", "hole"]}
    ]
  },
  "constraints": {"bbox": {"x": [75, 85], "y": [45, 55]}, "volume_mm3": [15000, 26000]}
}
```

```bash
python3 -m atta model --spec-file examples/bracket/spec.json
python3 -m atta deliver --formats step          # 解析式 B-rep，不需要 Blender
```

7. 只有 verdict 为 `pass` 才产出文件（前提：要 Blender 的格式需 Blender 在 PATH，或用 `ATTA_BLENDER` 指定具体 build；该变量具有权威性，解析失败就报无 Blender，不会静默换一个）：

```bash
python3 -m atta preview --mode studio --views hero --res 1200
python3 -m atta deliver --formats glb,obj,stl
```

无 Blender 时 `deliver` 降级而不是崩溃：仍会 verify 并写 manifest，未导出格式逐条标 `blender_unavailable` 并给 `fix`；`preview` 没有退路，直接报错——此时改用 `describe --perceive`。

8. 接 agent。MCP（stdio JSON-RPC）：

```bash
python3 -m atta.agent.install claude     # 打印 Claude Desktop JSON
python3 -m atta.agent.install cursor     # 打印 Cursor JSON
python3 -m atta.agent.install zcode      # 合并进 ~/.zcode/cli/config.json
python3 -m atta.agent.mcp                # 或直接起 server
```

每条生成的配置都用绝对路径：`python -m atta.agent.mcp` 配 `cwd`、`ATTA_ROOT`、`PYTHONPATH` 指向该 checkout；装完要重启宿主才加载 `atta_*` 工具。

HTTP 桥（仅回环、无鉴权，是本地 agent 桥不是网络服务，**不要暴露端口**）：

```bash
python3 -m atta.agent.http --port 8765

curl -s localhost:8765/health
curl -s localhost:8765/tools
curl -s "localhost:8765/manifest?format=openai"
curl -s -X POST localhost:8765/call -H 'content-type: application/json' \
     -d '{"tool":"atta_model","args":{"recipe":"product.mug"}}'
```

9. 隔离工作区：状态（`models.json`、preview、导出）落在 `$ATTA_HOME/_atta/`，默认当前目录；把 `ATTA_HOME` 指到项目目录并把 `_atta/` 加进该项目的 `.gitignore`。宿主插件 `import atta` 失败时设 `ATTA_PYTHON` 指向 venv 的解释器；checkout 搬家时设 `ATTA_ROOT`。

10. 读错误、不打补丁式重试：
    - `status: "repaired"` = 参数越界被夹紧，**必须**读 `applied_patches` / `issues`，你拿到的不是你要的模型；
    - `deliver` 返回 `status: "blocked"` = verify 未过，按 `verify.issues` 首条的 `fix` 改后重建，`degraded` 需显式 `allow_degraded=true`；
    - `unknown_recipe` 的 `fix` 会列出 23 个合法 id；`no_models` 多半是 `ATTA_HOME` 指错地方。

## 对应的研究问题

- **能力发现**：`describe` 提供 bbox、体积、拓扑、壁厚、射线与 ASCII 截面，`perceive` 是亚秒级文本取景器。这类「读测量值做设计决策」的工作，平时很少交给模型（常规做法是让模型看渲染图猜形状），原文明确把它划进模型可承担的范围。
- **任务匹配**：把任务切成两端——模型写/改 spec 并提约束，内核做确定性几何与测量。接口是 Spec v3（`recipe` / `graph` / `assembly` 三种 kind），协作方式是 MCP 工具或 HTTP 桥；`atta_run` 可在一次调用里串多步流水线并在线程间传 `model_id`，`atta_variant` 可在参数空间采样、或针对实测指标反解目标，属于「模型定目标、内核求解」的分工。
- **条件供给**：给了 schema（`atta.spec/v3`）、可查的参数清单（`catalog --verbose` 逐算子必填/可选键）、可机读的错误（`code` / `path` / `fix`）、`--json` 信封，以及让宿主跑通的环境变量（`ATTA_PYTHON`、`ATTA_ROOT`、`PYTHONPATH`、`ATTA_HOME`、`ATTA_BLENDER`）。这些正是「喂给模型的可测量事实 + 反馈通道」。
- **主动推进**：材料支持「状态触发」型推进——verify 不过则 deliver 拒绝、参数越界自动夹紧并标记 `repaired`、多步流水线一次调用跑完；但原文没有描述按时间或外部事件触发的调度机制，这一条只能部分对应。
- **效果验证**：三态闸门 + 可存回执；同 spec 复现同 geometry hash（可复现性本身即验证手段）；约束写成 `bbox` / `min_wall_mm` / `volume_mm3` 这类可测量判据；`deliver` 硬拒绝未过闸的产物，而不是「尽量导出」。

## 与已有做法的关系

清单中相关条目：**Cursor（status: watch）** 与 **ZCode（status: avoid）**。原文直接给了这两者（以及 Claude Desktop）的 MCP 安装命令：`python3 -m atta.agent.install cursor` / `zcode` / `zcode-plugin`，ZCode 还提供原生插件与本地 marketplace 路径。

与清单判断有一处冲突：清单把 ZCode 标为 avoid，而 Atta 提供 ZCode 原生集成；但这不构成采用 Atta 的前提——用 Cursor 的 MCP 条目或 HTTP 桥即可绕开 ZCode，试的时候优先走这两条。

DSH 插件（`python3 -m atta.agent.install dsh --create`，以及仓库根 `package.json` 作为 bundle shim）在清单中没有相关条目。

## 证据与局限

**证据**：原文给出可执行命令、完整的 spec 示例，以及 `perceive` 的真实输出样例（`product.mug: 116.7x83.1x95.0 mm; aspect 1.00:0.71:0.81; V=93.69 ml; closed=yes; genus=1; comps=1; convex=0.19; sym=y; holes~1; dih95=3.7`），还有一张「有/无 Blender 各哪些动词可用」的能力矩阵，以及一张把症状映射到原因和修法的排障表。

**只是作者主张**：`describe` < 0.3 s、`model` 「well under a second」的性能数字；「10 tools / 23 recipes / 25 feature ops」的覆盖量；「measure 后才允许 render 存在」确实能提升产出质量这一因果判断。仓库虽含 `corpus/bench` 与 benchmark runner，README 未给出任何基准数值。

**局限**：项目规模小（33 stars），看不到外部采用案例；测量精度与算子边界只有 `docs/SHAPE_COVERAGE.md` 的自述；STEP 导出只覆盖 graph spec 的子集且需 `build123d`；assembly（13 种 mate、按雅可比秩求 DOF）只在架构文档里，README 没有可复现样例；HTTP 桥无鉴权，只能本机用。**适用条件**：需要精确、可复现几何的 CAD / 3D 打印 / 零件设计任务；非几何任务只能借它的设计原则，不能直接套这套工具。

## 怎么试、怎么验证

**最小试用**（半天量级）：装好后跑完 Quickstart 六步，确认 `doctor --deep` 全绿、mug 与 bracket 两个 spec 都能 build → describe → verify → `deliver --formats step`。然后做一个真实小任务：只给 agent spec 与约束（不给截图），让它靠 `describe` / `perceive` 迭代到 `verify` 返回 `pass`，再导出 STL 打印或用卡尺量关键尺寸对账。

**判断改善的指标**：
1. 从需求到 `verify=pass` 的迭代轮数（基线：人工建模，或让模型「看渲染图猜」）；
2. 首次 verify 的通过率；
3. `describe` 报的 bbox / 壁厚 / 体积与实物实测的偏差；
4. 人工干预次数，重点看 `repaired` 与 `blocked` 是否都由模型自己按 `fix` 修掉；
5. **负向测试**：故意给一个违反 `min_wall_mm` 的 spec，确认 `deliver` 真的 `blocked` 而不是放行——这一条不过，整个「验证回路」的迁移价值就不成立。
