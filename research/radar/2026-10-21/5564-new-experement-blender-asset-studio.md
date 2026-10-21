# new-experement/blender-asset-studio

- 结论：**值得一试**。已配置 Blender MCP 的团队可以把它装成 Codex/Claude Code 技能小范围试用，重点照搬“先做代表性样件→渲染比对→可量化修复→复检→独立导出验证”的闭环；没有 Blender 环境则只借鉴这套自检结构，因为原文只给了安装命令和功能清单，没有可脱离仓库复用的完整流程与提示词。
- 原文：https://github.com/new-experement/blender-asset-studio
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T06:08:42.972Z

## 是什么

`new-experement/blender-asset-studio` 是一个把“3D 资产制作”包装成智能体技能（skill）的仓库，通过 Blender MCP 让 agent 生成并迭代可编辑 3D 资产。它的主张不只是“让 AI 建模”，而是让 agent **自己看渲染结果、按可量化的缺陷修复、再看新结果，最后校验真正导出的文件**。

仓库含两套独立适配：

| 环境 | 技能 | 说明 |
|---|---|---|
| Codex | `codex/blender-asset-studio` | v1.3.0，含指令、模板、诊断脚本 |
| Claude Code | `claude-code/blender-asset-studio` | 面向 Claude Code 的指令 |

两版都从任务与相关项目里推断风格、尺寸、相机假设与制作约束；能力不同：Codex 版包含 Imagegen 工作流，Claude 版只描述其自身可用工具。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提：先自备运行环境。** 安装 Blender，在你的 agent 中配置好 Blender MCP，并（Codex 版需要时）准备图像生成器。README 明确声明：本仓库不安装 Blender、MCP server 或图像生成器。

2. **拉取仓库。**

```bash
git clone https://github.com/new-experement/blender-asset-studio.git
cd blender-asset-studio
```

3. **安装 Codex 适配（装整套目录，含支持文件）。** 若目标已存在，先保留现有版本或换位置。

```bash
mkdir -p ~/.codex/skills
cp -R codex/blender-asset-studio ~/.codex/skills/
```

若使用自定义 `CODEX_HOME`，改装到它的 `skills` 目录下。

4. **安装 Claude Code 适配。**

```bash
mkdir -p ~/.claude/skills
cp -R claude-code/blender-asset-studio ~/.claude/skills/
```

5. **调用技能**（Codex / Claude Code 分别用下列写法；示例提示词原文照抄）。

```text
$blender-asset-studio Create a model from the attached references.
```

```text
/blender-asset-studio Create a model from the attached references.
```

6. **跑自带的诊断脚本（Codex 包）。** 需要 Pillow，并把 Blender 可执行文件路径传进去；测试在独立后台进程里建临时 fixture，不连真实 Blender 场景。

```bash
cd codex/blender-asset-studio
python3 scripts/test_helpers.py --blender /path/to/blender
python3 scripts/test_geometry_audit.py --blender /path/to/blender
python3 scripts/test_intersections.py --blender /path/to/blender
```

7. **按 README 列出的流程使用（这是可迁移的部分，顺序照它写的走）：**
   1. 任务澄清、参考素材输入、视觉方向选择；
   2. 先做出一个**有代表性的样件**并通过，再把方法扩展到整个资产；
   3. 对照目标做整体对比与对应区域对比；
   4. 做**可量化的修复**，然后检查新渲染出的结果（不是凭想象认为改好了）；
   5. 检查可见性、支撑/接触、非预期穿插、操作间隙；
   6. 分三件事验收：艺术验收、源文件技术检查、导出验证；
   7. 修复预算耗尽时，保留最佳候选并**列出未解决的缺陷**（不要假装完成）。

> 注意：第 7 步之后的具体技能指令、模板内容在仓库文件里，README 没有展开；本次只能用 README 判断。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现：** 仓库明确指出，可交给智能体去做的是“自检—修复—复检”这一环（visual reference review、actionable repairs、geometry diagnostics、verification of actual exports），而不只是生成模型。也就是说，原本以为必须人来做产出的“质量核对”工作，可以交给智能体完成。
- **任务匹配：** 适配对象是 Codex 与 Claude Code 两个 agent 环境，工具链是 Blender + Blender MCP（Codex 版再加 Imagegen 工作流）；协作方式是“技能包 + 附件参考图 + 一次性调用”。策略上强调先做一个代表性样件再扩展，而不是一次性制作整件资产。
- **条件供给：** 需要提供 Blender 可执行文件、已配置的 MCP、参考图/风格与尺寸、相机假设与制作约束（从任务和项目中推断）、以及导出目标；反馈来源是渲染结果与新渲染的对比、以及几何诊断脚本输出。
- **主动推进：** 原文没有给出时间/事件/状态触发的自动运行机制；唯一涉及状态的是“修复预算耗尽即停并保留最佳候选、报告未解决缺陷”这一终止条件。诊断脚本**不会自动修复**模型。
- **效果验证：** 明确要求把三类检查分开：艺术接受度、源文件技术检查、导出验证；用几何诊断/交叉检查脚本做技术核对。同时 README 自己点明验证的边界。

## 与已有做法的关系（对照给出的清单条目）

清单中的 **Claude Code（tool，adopt）** 直接相关：本仓库的 `claude-code/blender-asset-studio` 就是一个装到 `~/.claude/skills` 下的 Claude Code 技能，等于给 Claude Code 增加了一套 3D 资产生产的技能化用法，而不是替代它。清单中没有其他的 3D 资产、Blender 或 MCP 相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **给出的可核查内容：** 两个适配目录及版本号（Codex v1.3.0）、安装与调用命令、三个测试脚本的运行方式及其依赖（Pillow、Blender 路径）、MIT 许可。仓库有 35 stars（弱信号）。
- **作者主张（无数据支撑）：** “visual reference review / actionable repairs / 各类间隙检查”的效果；没有任何质量对比、成功率、案例截图或前后差异数据。
- **作者自己承认的局限：** 不保证 AAA 质量；修复预算耗尽时只能保留最佳候选并标注缺陷；**技术有效不等于艺术上被接受**；诊断不自动修复；接触（contact）不能证明没有穿插；采样不能保证检出所有碰撞；保存的单帧不能验证整段运动。
- **测试本身的局限：** 测试只创建临时 fixture、在独立后台进程中跑，不连接真实 Blender 场景，因此脚本通过 ≠ 真实资产可用。
- **适用条件：** 已在用 Blender 且已配好 MCP 的 3D 内容生产场景；其他“产出型任务”只能借鉴闭环结构，不能照抄具体步骤。
- **材料局限：** 本次仅依据 README（无正文代码与技能指令），无法验证技能内部流程细节，因此不上升到 adopt。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天量级）：**
1. 选一个**小而完整**的资产（例如一张带桌腿接触、有明确尺寸的桌子），准备 2–3 张参考图，写下尺寸、朝向、导出格式三项硬约束。
2. 按上面的命令安装并调用一次技能，走完“样件 → 对比 → 修复 → 复检”至少 2 轮。
3. 同时跑一组**基线**：同样的参考图和约束，用普通对话直接让 agent 生成，不走该技能。
4. 导出后做导入验证：能否正常导入、尺寸/朝向是否正确、是否仍是可编辑网格、材质是否丢失。

**判断改善的指标（试用前先定阈值）：**
- 达到“可接受”所需的**修复轮次**（越少越好，说明自检有效）；
- 人工返工项数（尤其是“agent 声称已修好但实际没修”的次数，即**虚假通过率**）；
- 导出失败率 / 导入后需手工修的比例；
- 盲评艺术接受度（不看是谁做的，由人打分）；
- **未解决缺陷清单的完整度**：agent 结束时报出的缺陷与人工查出的缺陷是否对得上。这一项最能说明自检闭环是真在工作，还是只在表演。

如果两轮内虚假通过率仍高、或修复轮次与基线无差别，就把它降级为“只借鉴流程结构”，不要写进手册当作工具推荐。
