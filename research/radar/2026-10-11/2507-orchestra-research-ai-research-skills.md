# Orchestra-Research/AI-Research-SKILLs

- 结论：**值得一试**。建议小范围试用：先用 npx 安装器或 Claude Code 的 /plugin 命令装一两个类别，在真实任务上跑一遍，同时把它的 skill-name/SKILL.md + references/ 目录规范抄来整理自己已有的内部知识；理由是原文给出了可直接复制的安装命令和技能打包结构，但单个技能的正文没有随材料给出，宣称的效果只能自测。
- 原文：https://github.com/Orchestra-Research/AI-Research-SKILLs
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T07:13:46.780Z

## 是什么

Orchestra Research 的开源技能库（GitHub: Orchestra-Research/AI-Research-SKILLs，MIT，输入 metrics 显示 13,433 stars），把 AI 研究的全流程知识拆成 98 个可安装「技能」，打包给 Claude Code、Cursor、Gemini CLI 等编码智能体使用。技能分 23 类：Autoresearch（编排层）、Ideation、ML Paper Writing、Model Architecture、Fine-Tuning、Post-Training、Distributed、Optimization、Inference、Evaluation、Agents、RAG、Prompt Engineering、MLOps、Observability、Multimodal、Emerging Techniques、Agent-Native Research Artifact 等。每个技能是一个目录，含一份 50–150 行的 SKILL.md 快速参考和 300KB+ 的 references/ 深度文档。安装有三条路径：npx 交互式安装器、Claude Code 插件市场、让 agent 自己读 welcome.md 自助安装。

注意：材料只有 README，且结尾被截断（"Individual skills may reference libraries with differ…"），单个技能的实际正文不在材料中。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本地有 Node.js（要用 npx）；已安装至少一个被支持的编码智能体（README 列出自动检测对象：Claude Code、Hermes Agent、OpenCode、Qoder、Cursor、Gemini CLI 等）；能访问 npm 与 GitHub。

1. 交互式安装（推荐路径）。安装器会自动检测已装的编码智能体，把技能装到 `~/.orchestra/skills/` 并对每个 agent 建符号链接（Windows 上退化为复制），可选全部 / quickstart 包 / 按类别 / 单个技能。

```bash
npx @orchestra-research/ai-research-skills
```

2. 或者让 agent 自助安装——把下面这段原文直接发给你的 agent：

```
Read https://www.orchestra-research.com/ai-research-skills/welcome.md and follow the instructions to install and use AI Research Skills.
```

3. 日常管理（查看/更新已装技能）：

```bash
# Interactive installer (recommended)
npx @orchestra-research/ai-research-skills

# Direct commands
npx @orchestra-research/ai-research-skills list      # View installed skills
npx @orchestra-research/ai-research-skills update    # Update installed skills
```

4. 在 Claude Code 里按类别装（替代路径，前提是已用 Claude Code CLI；README 说有 23 个类别可装，以下只是它举的 5 个例子）：

```bash
# Add the marketplace
/plugin marketplace add orchestra-research/AI-research-SKILLs

# Install by category (23 categories available)
/plugin install fine-tuning@ai-research-skills        # Axolotl, LLaMA-Factory, PEFT, Unsloth
/plugin install post-training@ai-research-skills      # TRL, GRPO, OpenRLHF, SimPO, verl, slime, miles, torchforge
/plugin install inference-serving@ai-research-skills  # vLLM, TensorRT-LLM, llama.cpp, SGLang
/plugin install distributed-training@ai-research-skills
/plugin install optimization@ai-research-skills
```

5. 抄它的技能目录规范，用来整理自己的知识（这是整份材料里最容易迁移的一步）：

```
skill-name/
├── SKILL.md                    # Quick reference (50-150 lines)
│   ├── Metadata (name, description, version)
│   ├── When to use this skill
│   ├── Quick patterns & examples
│   └── Links to references
│
├── references/                 # Deep documentation (300KB+)
│   ├── README.md              # From GitHub/official docs
│   ├── api.md                 # API reference
│   ├── tutorials.md           # Step-by-step guides
│   ├── issues.md              # Real GitHub issues & solutions
│   ├── releases.md            # Version history & breaking changes
│   └── file_structure.md      # Codebase navigation
│
├── scripts/                    # Helper scripts (optional)
└── assets/                     # Templates & examples (optional)
```

配套的质量要求（README 自述）：SKILL.md 只放 50–150 行快速参考，细节进 references（渐进式披露）；文档来源要求是官方仓库、真实 GitHub issue、生产工作流；必须写清「When to use this skill」；必须列 breaking changes。

6. 用编排层跑长任务。autoresearch 技能用双循环架构（inner optimization + outer synthesis）串起从文献综述、构思、实验到写论文的全流程，并按需把任务路由给各个领域技能；持续运行依据 README 是支持 Claude Code 的 `/loop` 和 OpenClaw heartbeat。

7. 按 use case 直接对号入座：微调 Llama 3 → `03-fine-tuning/axolotl/`；优化推理延迟 → `12-inference-serving/vllm/`；学 transformer 原理 → `01-model-architecture/litgpt/`；扩到 100 GPU → `08-distributed-training/deepspeed/`。

前提提醒：步骤 1、2 会把第三方技能写进 `~/.orchestra/skills/` 并 symlink 到各 agent 目录，等于给你所有智能体注入新的指令来源；README 没有给权限、沙箱或安全说明，先审阅内容再用。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 本身就是一份「AI 已经能做、但常没想到交给它」的清单，按类别把研究全流程列了出来——机械可解释性（TransformerLens、SAELens、pyvene、nnsight）、量化（GPTQ/AWQ/HQQ/GGUF）、投机解码、模型合并、长上下文、知识蒸馏、剪枝、论文写作与学术作图、技能化的研究记录（ARA Compiler / Research Manager / Rigor Reviewer）。两个 demo 自称 agent 自主发现了新结论：从 ETF overlap 的 null result 转向，发现 norm 异质性可预测微调难度（r=-0.99）；以及在 RL brain scan 中发现 DPO 是 rank-1 扰动、单一 SVD 方向即可恢复 95.6%。这两条是作者自述，材料未提供独立复现。
- **任务匹配**：它的匹配逻辑是把任务按「研究阶段 × 具体框架」切成 23 类，每个技能对应一个具体工具（如 vLLM、TRL、Axolotl），入口是 SKILL.md 的「When to use this skill」，细节放 references 按需加载——这正是给上下文预算有限的 agent 用的分层匹配。大任务则由 autoresearch 编排层路由到领域技能，而不是靠一个通用模型包打天下。
- **条件供给**：需要 (1) Node/npx 或 Claude Code CLI；(2) 至少一个被支持的智能体；(3) 访问 npm/GitHub 的网络；(4) 写入 `~/.orchestra/skills/` 并 symlink 到各 agent 目录的权限。README 明确说安装器会「Auto-detects your installed coding agents」并自动建立链接，即「工具与权限」这一环由安装器代劳。至于反馈如何回灌、错了怎么纠偏，README 未提。
- **主动推进**：autoresearch 的双循环架构 + Claude Code `/loop` + OpenClaw heartbeat 支持无人值守持续运行；ARA Research Manager 是一个「会话结束时自动运行」的复盘器，从对话历史里提取决策、实验、死胡同和转向，写进 `ara/` 目录并标注人/机来源。这两条正好对应「由事件或状态触发并持续完成」。
- **效果验证**：ARA Rigor Reviewer 提供 ARA Seal Level 2 语义评审，对六个维度打分（证据相关性、可证伪性、范围、一致性、探索完整性、方法），并按严重度排序输出发现——这是一张可借用的结果打分卡。任务级验证则靠 Evaluation 类（lm-evaluation-harness 60+ 任务、BigCode 的 pass@k、NeMo Evaluator）。demo 中的具体数字（r=-0.99、95.6%、1.9× 压缩仅 1.3% ppl 损失）是作者给出的效果证据。

## 与已有做法的关系（对照给出的清单条目）

清单中已有：Claude Code（adopt）、Cursor（watch）、Hermes（watch）、OpenClaw（watch）、OpenCode（watch）。本仓库与它们直接相关：安装器明确会自动检测 Claude Code、Hermes Agent、OpenCode、Qoder、Cursor、Gemini CLI，并把技能 symlink 进各自目录；Claude Code 另有 `/plugin marketplace add` 这条官方插件通道。所以如果已在用 Claude Code，这份技能库是「给现有 agent 加研究能力包」的最短路径之一；对处于 watch 状态的 Cursor / Hermes / OpenClaw / OpenCode，它是一个现成的测试素材，可用来判断这些工具能否承接研究型长任务。清单中没有「技能打包格式 / 技能库组织方式」这一类条目，而 SKILL.md + references 的目录规范恰恰是本次材料里最可直接迁移的部分。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据：README 自述了技能结构、质量标准（300KB+ 文档、真实 GitHub issue、版本历史）、安装方式与 7 个 demo；输入 metrics 给出 13,433 stars；README 称平均每技能 420 行、总文档约 130,000 行、65 个 gold standard 技能、覆盖 23 类。

局限与矛盾：
- 数字自相矛盾：正文标题写「98 Skills」，Roadmap 统计表却写「Skills 87（current）」；同一份材料两个口径，实际技能数无法确定。
- 作者人数为 1（Contributors: 1，target 100+），基本没有第三方交叉验证。
- 材料只有 README 且结尾被截断，单个技能的 SKILL.md 正文完全没出现，因此「production-ready」「battle-tested」只能算作者主张，无法核实。
- demo 结果（r=-0.99、95.6% recovery、1.9× 压缩/1.3% ppl 损失、「两篇论文完全由 agent 写成」）均为作者自述，材料未给第三方复现或评测方法。
- 「autoresearch 支持 Claude Code /loop 和 OpenClaw heartbeat」只有一句陈述，没有配置细节。
- 适用条件：面向做 AI/ML 研究与工程、且已有可安装技能的编码智能体的人。对不碰模型训练/推理的通用办公场景，直接价值有限，可迁移的主要是「技能目录规范」这一层。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用（半天内可完成）：在已装 Claude Code 的机器上只装一个类别，挑一件手头真实的小任务跑通。例如装推理服务类后用 vLLM 技能把一个小模型跑起来并给出压测数据；或装 prompt-engineering，用 Instructor / DSPy 把一个手写的结构化输出提示词改成带校验的版本。注意先在隔离环境试，审阅装进去的 SKILL.md 内容再接入日常工作流。

零风险试法（不安装任何东西）：只把 `skill-name/SKILL.md + references/` 这套目录规范抄过来，把团队已有的一份内部文档（上线检查清单、某框架的踩坑记录）拆成 100 行以内的 SKILL.md 加参考文件，看同事或 agent 在没有背景说明的情况下能不能照着做出来。

判断改善的指标：
- 同一任务装技能前后的耗时、需要查外部文档的次数、返工轮数；
- agent 首轮输出是否可直接使用（而不是先纠正一轮）；
- 你写出的 SKILL.md 被第二个人或第二个 agent 直接复用的次数；
- 用 Rigor Reviewer 的六维（证据相关性、可证伪性、范围、一致性、探索完整性、方法）当自评表，比较用技能前后的产出打分；
- 对长任务，记录 autoresearch/`/loop` 无人值守推进的中断次数与人工介入频率。
