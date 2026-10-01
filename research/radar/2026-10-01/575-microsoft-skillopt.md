# microsoft/SkillOpt

- 结论：**值得研读**。把 SkillOpt 的“技能文档即训练对象 + 验证门把关”方法论作为研读材料纳入手册思路，暂不照做；因为原文只给出 pip 安装和 WebUI 启动命令，真正的数据准备、训练/评估命令与配置都被导向未提供的官方文档，无法仅凭材料复现。
- 原文：https://github.com/microsoft/SkillOpt
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T13:27:44.355Z

## 是什么

SkillOpt 是微软开源的工具（GitHub stars 17918，MIT 许可，Python 3.10+，PyPI 包名 `skillopt`）。核心主张：把“技能文档”当作可训练状态，**冻结模型权重**，只优化一份文本技能，产出可部署的 `best_skill.md`（通常 300–2,000 tokens），部署时不增加任何推理调用。

它借用神经网络训练的纪律来做文本空间优化：epoch、mini-batch、文本学习率预算、被拒编辑缓冲（rejected-edit buffer）、epoch 级 slow / meta 更新，以及最关键的 **held-out 验证门**——候选编辑只有在严格提升验证分数时才被接受。

版本要点（原文所述）：
- v0.1.0（2026-06-02）：完整训练循环 `rollout → reflect → aggregate → select → update → evaluate`；多后端（OpenAI / Azure / Claude / Qwen / MiniMax）；六个内置基准；WebUI 面板。
- v0.2.0（2026-07-02）：新增 **SkillOpt-Sleep**，夜间离线自演化引擎（`harvest → mine → replay → consolidate`，藏在 held-out 验证门后），提供 `skillopt-sleep` CLI；为 Claude Code、Codex、Copilot、Devin 提供集成外壳，并有一个 OpenClaw 参考适配。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**重要前提：原文 README 明确把“安装、数据准备、训练/评估命令、配置、框架内部”全部指向 SkillOpt 文档（docs/index.md、Documentation & Reproduction Guide、Technical Blog），而这些文档不在本次材料中。以下只列出原文本身给出的可照做内容，训练循环与扩展契约只能作为流程描述，不能当作可执行步骤。**

1. 安装（前提：Python 3.10+）：
```bash
pip install skillopt
```

2. 按原文指定的入口查文档后再动手（前提：能访问仓库 docs）：
   - `docs/index.md`
   - Documentation & Reproduction Guide（microsoft.github.io/SkillOpt/docs/guideline.html）
   - Technical Blog（microsoft.github.io/SkillOpt/blog/）

3. （可选）启动监控面板（前提：在本仓库源码目录下，且已装 webui 额外依赖）：
```bash
pip install -e ".[webui]"
python -m skillopt_webui.app
```
可用参数：`--port` 默认 `7860`；`--host` 默认 `127.0.0.1`（仅回环，需对外暴露时传 `--host 0.0.0.0`）；`--share` 默认关闭（开启会生成 Gradio 公网链接）。

4. 训练循环（原文给出的概念流程，非命令行）：`rollout → reflect → aggregate → select → update → evaluate`；由一个独立的优化器模型把打分后的 rollout 转成对同一份技能文档的“有界 add / delete / replace 编辑”，默认路径下候选编辑只有在严格提升 held-out 验证分数时才被接受。

5. 扩展新后端（原文给出的契约）：若某 provider 实现了 OpenAI Chat Completions 协议，先用内置 `openai_compatible` 后端，不要急着写代码；聊天后端新增 `skillopt/model/<name>_backend.py`；仅目标的 exec 后端复用 `codex_harness.py` 中的共享 harness；两者都通过 `common.py`、`backend_config.py`、`skillopt/model/__init__.py` 注册。已列出的后端：`openai_chat`、`claude_chat`、`qwen_chat`、`minimax_chat`、`copilot_chat`、`openai_compatible`、`codex_exec`、`claude_code_exec`、`cursor_exec`、`copilot_exec`。

6. 扩展新基准（原文给出的契约）：一个基准 = `skillopt/envs/<name>/` 包，包含 adapter、数据加载器、打分 rollout 辅助、一份 YAML 配置，以及可选的初始 seed skill；最简参考是 `skillopt/envs/searchqa/`。

7. 夜间自演化（v0.2.0，前提：本地有 Claude Code / Codex / Copilot 之类的编码智能体会话记录）：用 `skillopt-sleep` CLI，按 `harvest → mine → replay → consolidate` 的流程复盘历史会话、复现高频任务，并把通过 held-out 验证门的技能固化下来。原文说明主 CLI 保持保守默认值，未把所有实验性控制项都暴露为命令行参数。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：它把一个此前很少明确“交给 AI”的工作变成了 AI 的可优化对象——技能文档本身的编写与迭代，而不是让模型直接干活。原文的落点是“把技能当可训练参数”，属于作者主张层面的能力发现，没有给出“哪些新任务因此可以交给 AI”的清单。
- **任务匹配**：给出了后端与执行 harness 的匹配面——聊天后端（OpenAI / Azure / Claude / Qwen / MiniMax / 通用 `openai_compatible`）与执行后端（Codex CLI、Claude Code CLI、Cursor、Copilot），并在三种 harness（direct chat、Codex CLI、Claude Code CLI）上评估。原文给的选型规则只有一条明确的：兼容 OpenAI Chat Completions 就先试 `openai_compatible`。
- **条件供给**：需要提供的是“可打分的 rollout”、一个 held-out 验证集、以及可选的初始 seed skill；框架侧还需 benchmark 适配器与 YAML 配置；优化器模型与目标模型是分离的两方。原文没有给出提示词模板、权限或反馈格式等更细的供给要求。
- **主动推进**：SkillOpt-Sleep 是明确的按时间触发的离线自演化（夜间运行），动作链条是复盘历史会话 → 复现高频任务 → 在验证门后固化技能，属于“时间触发 + 持续完成”的形态。原文未给出调度器/cron 之类的具体配置。
- **效果验证**：验证机制是原文最实的一块——held-out 验证门作为编辑接受准则；报告在 6 个基准 × 7 个目标模型 × 3 个 harness 共 52 个 (model, benchmark, harness) 单元上全部最优或并列最优；GPT-5.5 上平均无技能基线提升 +23.5（direct chat）、+24.8（Codex 循环内）、+19.1（Claude Code 内）；技能产物可跨模型规模、跨 Codex/Claude Code harness、跨邻近基准迁移而不需再优化。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Agent skills（concept，adopt）**：高度相关。SkillOpt 正是把 agent skills 当作可训练状态来生产与迭代，产物就是一份 `best_skill.md`。
- **Claude Code（tool，adopt）**：README 提供 `claude_code_exec` 后端、Claude Code 集成外壳，并把它作为三种评估 harness 之一。
- **Cursor（tool，watch）**：README 列出 `cursor_exec` 后端。
- **OpenClaw（tool，watch）**：README 提到提供一个 OpenClaw 参考适配。
- **arXiv（source，try）**：对应论文 arXiv:2605.23904，是方法与消融、逐单元结果的唯一出处，材料中未含正文。
- **the-decoder（source，drop）**：README 引用了 The Decoder 的报道作为新闻覆盖，本身不含可操作内容，与既有 drop 状态一致。
- **Trendshift（source，watch）**：README 挂有 Trendshift 仓库徽章，属热度信号。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的证据**：v0.1.0 / v0.2.0 的发布记录（PyPI 包、CLI 名称、集成外壳清单）；三个第三方项目已集成（gbrain、gbrain-evals、darwin-skill）；微软研究院官方 feature、VentureBeat、机器之心、Flowtivity、The Decoder 的报道链接；以及上面引用的 52 单元全胜与 +23.5 / +24.8 / +19.1 的提升数字。

**只是作者主张的部分**：所有性能数字与方法优越性都出自 README/论文自述，本次材料没有可复核的评测细节；“优化器模型把打分 rollout 转成有界编辑”“文本学习率预算”“被拒编辑缓冲”等机制描述也只是概述，没有公式或伪代码。

**适用条件**：需要有可自动打分的任务集和一份独立 held-out 验证集，否则“验证门”这一核心机制无从落地；对难以自动评分的开放式工作（写作、决策、沟通类）是否适用，原文没有给出依据。原文未提成本，只说部署期零额外模型调用（训练期显然要跑大量 rollout，成本未知）。

**材料层面的局限**：本次只有 README，真正的可执行命令（数据准备、训练/评估、配置）被原文显式指向未提供的 docs。另外原文中所有日期均为 2026 年，需以实际仓库状态复核。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（前提：先拿到官方 docs，否则只能做第 1 步）**：
1. `pip install skillopt`，确认能装、能起 WebUI（`python -m skillopt_webui.app`）。
2. 挑一个内置基准里的最简参考 `skillopt/envs/searchqa/`，照 docs 跑通一次完整循环，观察是否产出 `best_skill.md`。
3. 若有 Claude Code / Codex，用 `skillopt-sleep` 跑一周夜间离线整理，看它固化了哪些技能。

**判断有没有改善的指标**：
- 主指标：同一目标模型下，held-out 验证集上“带 `best_skill.md`”与“无技能基线”的得分差；SkillOpt 自身的接受准则就是“严格提升验证分数”，可直接借用，若你的编辑没能严格提升就不该采纳。
- 迁移指标：把优化出的技能换到未参与优化的 harness 或邻近任务上，增益是否仍为正（原文宣称可迁移，这正好是可验证的假设）。
- 成本指标：技能 token 数（原文给的典型区间 300–2,000）与训练期 rollout 数量，用来判断投入是否划算。
- 负面信号：训练集分数上升但 held-out 不升，说明在过拟合技能文本，应停止采纳编辑。
