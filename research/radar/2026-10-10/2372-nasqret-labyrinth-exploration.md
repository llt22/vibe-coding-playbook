# nasqret/labyrinth-exploration

- 结论：**值得一试**。先在 Claude Code 或 Codex 里按 README 的 git clone 方式把它装成 skill，跑通 triangle-counts 示例后，拿一个自己领域里边界清楚的小型开放问题走 2–3 轮完整循环再决定是否推广；理由是它给出了可复制的安装/运行命令和一整套可操作的证据分级、独立裁判、地图更新流程，但材料只到 README 层，效果只有作者主张、没有量化证据。
- 原文：https://github.com/nasqret/labyrinth-exploration
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-10T04:48:30.874Z

## 是什么

Labyrinth exploration 是给 Codex 和 Claude Code 用的 skill，面向开放式研究——数学、理论科学、算法，以及任何“目标是弄清什么是仍然未知的”场景。它把研究计划当作迷宫探索：agent 维护一张精确地图，标出哪些走廊已探明（已证明或已穷举计算）、哪些已被封死（已反驳或不可能）、哪些门看得见但还没进（问题、猜想）、哪里还是黑暗。每次会话从这张地图出发并改变它；一次反驳也算进展，因为它把一条期望中的走廊变成墙，通常还会露出一扇新门。

方法自称开发于 2026 年 9–10 月的一个纯数学研究计划，并把该计划的 lessons 收进了 skill。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提条件**：装有 Codex 或 Claude Code（skill 本身要跑在其中一个客户端里）；Python 3.9 或更新（引擎和示例只用标准库）；一个浏览器（dashboard 从 CDN 加载 d3 和字体）。可选：一台获授权的 Slurm 集群做重计算、LaTeX 写笔记、一个配置好的私有 dashboard 目的地（Claude 里 Claude Artifacts 可以充当这个角色，Codex 可把生成的 HTML 留在本地）。

2. **安装整仓为 skill**。

   Codex（CLI、桌面 app 或 IDE 扩展）：
   ```bash
   mkdir -p "$HOME/.agents/skills"
   git clone https://github.com/nasqret/labyrinth-exploration "$HOME/.agents/skills/labyrinth-exploration"
   ```
   若要做项目级安装，改成 clone 到该项目仓库下的 `.agents/skills/labyrinth-exploration`。

   Claude Code：
   ```bash
   mkdir -p "$HOME/.claude/skills"
   git clone https://github.com/nasqret/labyrinth-exploration "$HOME/.claude/skills/labyrinth-exploration"
   ```

3. **从研究项目目录运行客户端，而不是从安装后的 skill 目录运行**。在 Codex 里调用 `$labyrinth-exploration` 或直接描述一个匹配的任务；在 Claude Code 里调用 `/labyrinth-exploration` 或描述任务。Codex 会自动发现新 skill，没出现就重启；Claude Code 安装后需要开一个新会话。两个客户端共用同一份 `SKILL.md`、references、templates 和数据格式，引擎和初始示例不需要 MCP server、客户端 SDK 或第三方 Python 包。

4. **先看一张完整地图**（仓库自带的公开示例：n 个顶点的图最多能有多少个三角形）。数秒构建，只需 Python 3：
   ```bash
   LABYRINTH_SKILL_DIR="$HOME/.agents/skills/labyrinth-exploration"  # Codex
   # For Claude Code: LABYRINTH_SKILL_DIR="$HOME/.claude/skills/labyrinth-exploration"
   LABYRINTH_DEMO_DIR="$(mktemp -d "${TMPDIR:-/tmp}/labyrinth-demo.XXXXXX")"
   mkdir -p "$LABYRINTH_DEMO_DIR/labyrinth/dashboard"
   cp "$LABYRINTH_SKILL_DIR/templates/lab.py" "$LABYRINTH_DEMO_DIR/labyrinth/"
   cp "$LABYRINTH_SKILL_DIR/templates/dashboard.html" "$LABYRINTH_DEMO_DIR/labyrinth/dashboard/template.html"
   cp "$LABYRINTH_SKILL_DIR"/examples/triangle-counts/{knowledge.json,events.jsonl,sota.json} "$LABYRINTH_DEMO_DIR/labyrinth/"
   python3 "$LABYRINTH_SKILL_DIR/examples/triangle-counts/make_example.py" "$LABYRINTH_DEMO_DIR/labyrinth"
   cd "$LABYRINTH_DEMO_DIR"
   python3 labyrinth/lab.py check && python3 labyrinth/lab.py build
   open labyrinth/dashboard/index.html        # or xdg-open on Linux
   ```

5. **用自己的问题启动**。在任一个客户端里描述研究计划，例如 README 给的原话：
   > I want to understand which values the crossing number takes on cubic graphs of each size.
   > Map what is known, set up the labyrinth for this project, and push the bounds.

   agent 读 skill 后会在你的仓库里建立 `labyrinth/`，之后按下面的循环工作，最后留下一个 dashboard 和一张 state-of-the-art 表。更多 prompt 在 `examples/prompts.md`。

6. **迭代循环（每轮的具体动作）**：每轮从地图上挑 1–3 扇门，同时用多个工具族去探索——后台文献扫描、小规模计算、极端例子和有名字的例子。然后提出一个**带测试的**大胆猜想，跑这个测试、记录结果、交给独立裁判、更新地图。被反驳的论断变成死胡同，附一行教训和修改后的陈述。

7. **地图不再变化时启用升级梯**：换工具、换参数或取极端值、放松一个假设、反转问题、从另一个社区引入方法，或者发动一次广泛攻击。

8. **门多到一轮处理不完时跑 campaign**：每条猜想配一个 attack agent（至少尝试五个视角）；每份报告交给一个独立裁判，裁判用自己的代码返回逐条结论和可直接套用的修正；writer 在副本上起草并把结果变成精确改动（在副本上测试）；coordinator（你或主 agent）审阅一切并整合。整合清单和实际踩过的失败模式见 `references/campaigns.md`，填空式简报在 `templates/briefs/`。

9. **地图的产物文件**（skill 会在你仓库里写这些）：
   | 产物 | 文件 | 内容 |
   |---|---|---|
   | knowledge graph | `labyrinth/knowledge.json` | 结果、猜想、直觉、开着的门、死胡同、族（families）、方法、来源，带类型化链接 |
   | event log | `labyrinth/events.jsonl` | 每一次发现及其发生时刻 |
   | frontier map | `labyrinth/frontier.json` | 每个尺寸下每个可取值分别处于什么状态（由你的脚本写入） |
   | state of the art | `labyrinth/sota.json` | 每个问题的最佳已知结果及其历史 |
   | dashboard | `labyrinth/dashboard/index.html` | 以上全部，由 `lab.py build` 生成 |
   | agent archive | `research/agents/<name>/` | 每个 agent 报告的原文，连同它的代码和它的裁判 |

10. **分级制度（硬规则）**：每个论断带一个层级，从 T1（文献中已证明）到 T6（一个直觉/猜测）。**低于 T3 的内容绝不作为事实引用**；直觉有意保留在板上，但必须清楚标注。T2 和 T3 的结果还额外带一个评审状态。

11. **隐私与维护**：dashboard 和笔记通常含未发表结果，skill 把它们留在本地，或**私下**发布到获授权的目的地；未经你同意，绝不把未发表结果放进任何公开物（帖子、图、共享 skill）。更新方式是 `git pull`。自测可跑 `python3 -m unittest discover -s tests -v`。

## 对应的研究问题

- **能力发现**：把开放式研究里原本靠人手动做的工作交给多 agent——文献扫描、猜想攻击（每条至少五个视角）、独立裁判、草稿撰写、协调整合。特别值得借鉴的是它把“反驳”也算作产出（死胡同 + 一行教训 + 修改后的陈述），这是通常想不到会主动去做的动作。
- **任务匹配**：分工写得很明确——attack agent 攻猜想、literature agent 做文献、每条报告配一个自带代码的独立裁判、writer 在副本上改、coordinator（你或主 agent）整合并提交。工具族按轮并行：后台文献扫描、小计算、极端/有名例子。引擎是标准库 Python，前端是单文件 HTML + d3。
- **条件供给**：需要 Codex 或 Claude Code 以及原生 subagents（用于文献扫描、独立裁判和 campaign）；Python 3.9+；浏览器；可选 Slurm 集群、LaTeX、私有 dashboard 目的地。反馈供给上要求每个论断带 tier（含评审状态），并且“来自 agent 或外部模型的结果在进入笔记之前先过独立裁判”；如果无法委派，结果保持 under review，直到存在独立检查。
- **主动推进**：每轮从地图挑 1–3 扇门并多工具族并行；地图停止变化时按升级梯继续（换工具、换参数或极端值、放松假设、反转问题、跨社区引入、广泛攻击）；campaign 本身是按“开着的门多到一轮进不完”这个状态触发的流水线式推进。
- **效果验证**：tier 分级（T1–T6，低于 T3 不作事实引用）；把“还剩多少”变成数字——frontier map 对每个尺寸把每个可取值分类为 realized / impossible / conditional / conjecturally impossible / unknown，dashboard 显示已解决比例及其随时间的变化；独立裁判逐条裁定并给出可套用的修正；`sota.json` 记录每个问题的最佳结果及其历史。

## 与已有做法的关系

清单中已有的条目是：Claude Code（tool，adopt）。这个仓库正是以 Claude Code skill 的形式安装使用的（同时也支持 Codex），相当于在 Claude Code 之上叠加一层“研究循环 + 证据分级 + 独立裁判 + 仪表盘”的工作流，不替代 Claude Code 本身；两者共用同一套 `SKILL.md`、references、templates 和数据格式。除此之外，清单中没有其他相关条目。

## 证据与局限

**原文给出的证据**：仓库带一个可运行的公开示例（n 顶点图的三角形计数），README 给出完整可复制命令，并称“数秒构建、只需 Python 3”；有 `tests/`（引擎测试和 skill 内部一致性测试）以及 `tests.yml` 的 GitHub Actions 徽章；方法自述开发于 2026 年 9–10 月的一个纯数学研究计划，并把该计划的 lessons 收进 skill；仓库有 30 stars；MIT 许可。

**只是作者主张、没有量化支撑的部分**：“It scales”（能扩展到多个开放问题）、campaign 流程更有效、独立裁判能真正纠正错误、dashboard 让进展可见——README 没有给出任何数字、对比实验或成功案例统计。

**局限与适用条件**：材料只到 README 这一层，`references/lessons.md`、`docs/tutorial.md`、`references/campaigns.md` 里的具体内容看不到，真正的可照做细节要装好之后自己读；方法主要面向数学/理论科学/算法这类开放式研究，能否迁移到日常工程、运营类工作没有证据；依赖 Codex 或 Claude Code 的 subagent 委派能力，缺了这个能力结果只能停在 under review；示例依赖浏览器从 CDN 加载 d3 和字体；隐私约束意味着未发表结果不能直接公开复用。

## 怎么试、怎么验证

**最小试用**：
1. 按第 2 步安装，从自己的研究项目目录按第 3 步启动，先用 `$labyrinth-exploration`（Codex）或 `/labyrinth-exploration`（Claude Code）触发一次，确认 skill 被识别（Codex 不识别就重启，Claude Code 需要开新会话）。
2. 跑通 triangle-counts 示例（第 4 步），确认 `lab.py check` 通过、`lab.py build` 生成 dashboard，并且能打开看到 tier 计数和 frontier 地图。这一步只是环境验证，不是效果验证。
3. 选一个自己领域里“边界清楚、能判定对错”的小型开放问题（不一定是纯数学，只要能列出可取值/可选项并逐个分类），用第 5 步的句式让它建 `labyrinth/`，跑 2–3 轮循环，看是否真的生成 `knowledge.json`、`events.jsonl`、`frontier.json`、`sota.json` 和 dashboard。

**判断有没有改善的指标**：
- 地图是否真的在变：每轮 `events.jsonl` 有新增；frontier 的已解决比例上升；或者出现“死胡同 + 一行教训 + 修改后的陈述”这种把反驳当进展的条目。
- 裁判是否真的起作用：故意提交一个错误或未验证的结果，看独立裁判（用自己的代码）是否给出否定或修正；如果所有报告都被直接放行，说明裁判环节形同虚设。
- 分级是否被守住：检查最终笔记里有没有低于 T3 的论断被当成事实引用（应只引用 T1–T3）。
- 对照基线：同一个问题用普通对话式提问再做一次，比较“能否说清还剩什么是未知”“结论是否可复核”“你手工整理地图花的时间”。没有改善就退回 study。
- 若跑 campaign（多猜想并行），额外检查整合后是否出现重复条目或互相矛盾的条目——README 提到 `campaigns.md` 里有整合清单和失败模式，可拿来对照。
