# wshobson/agents

- 结论：**值得一试**。先按 README 的最小路径小范围试用——Claude Code 用 `/plugin marketplace add` + 安装单个插件，或走 skills-only 的 `gh skill install` / `npx skills add` 只装技能，再用其自带的 `plugin-eval` 与 `make validate` 做质量筛检后再决定是否扩大；它给的是可直接复制的安装、生成与评测命令以及任务类型到模型档位的映射，但质量评测方法自认未经人工标注验证，规模数字也仅为自述，不宜直接全量采用。
- 原文：https://github.com/wshobson/agents
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T07:27:27.924Z

## 是什么

- wshobson/agents 是一个 agentic 插件市场仓库：单一 Markdown 源（`plugins/`）生成 6 个 harness 的本地化产物，Claude Code 为 source-of-truth，另适配 Codex CLI、Cursor、OpenCode、Antigravity CLI、Copilot、Pi。
- 规模（README 自述）：94 个插件（92 本地 + 2 外部 git-subdir）、202 个 agent、184 个 skill、105 个 command、16 个 orchestrator。
- 每个插件自包含且可组合：`agents/`、`commands/`、`skills/` 按目录结构自动发现；安装一个插件只把它自己的组件加载进上下文，而不是整个市场。
- 附带 plugin-eval 质量评测工具（静态、LLM judge、Monte Carlo 三层）。

## 具体做法

以下命令均照原文抄录，前提见各步。

1. Claude Code 安装（前提：已安装 Claude Code，可在会话内执行斜杠命令）

```bash
/plugin marketplace add wshobson/agents
/plugin install python-development          # 或 94 个插件中的任意一个
```

2. 只装技能（前提：已装 `gh` 或可用 `npx`；不克隆、不用市场、不生成。注意只装 skills，不含 agents、commands、hooks）

```bash
gh skill install wshobson/agents                                 # 浏览后选一个技能，或加 --all
gh skill install wshobson/agents python-testing-patterns --agent claude-code
npx skills add wshobson/agents --skill python-testing-patterns   # 可加 -a claude-code；-g 表示用户级作用域
```

3. Codex CLI / Cursor（前提：从仓库已提交的 registry 原生安装，registry 指向源 `plugins/`）

```bash
npx codex-marketplace add wshobson/agents        # Codex；之后逐个安装插件
# Cursor：先添加市场，再执行 /plugin install <name>（读取 .cursor-plugin/ 与源）
```

4. Antigravity / OpenCode / Pi（前提：git + make；转换后的目录树被 gitignore，需要本地生成）

```bash
gh repo clone wshobson/agents ~/agents && cd ~/agents
make generate HARNESS=antigravity && make install-antigravity  # Antigravity (agy)
make install-opencode                                          # OpenCode（内部执行 generate + 建立符号链接）
make generate HARNESS=pi && make install-pi                    # Pi
```

5. 批量生成与结构自检（前提：在仓库根目录）

```bash
make generate-all                        # 全部六个 harness
make validate                            # 结构检查
make garden                              # 漂移 / 死链 / 上限检测
```

6. 按任务层级选模型（插件内的模型配置策略，照原文表格）

| Tier | Model | 用途 |
|---|---|---|
| 0 | Fable 5 | 最长周期的自主工作——大规模迁移、数小时运行（需 opt-in，成本高） |
| 1 | Opus | 架构、安全、代码评审、生产关键路径 |
| 2 | inherit | 用户自选——后端、前端、AI/ML、专门领域 |
| 3 | Sonnet | 文档、测试、调试、API 参考 |
| 4 | Haiku | 快速操作类任务、SEO、部署、内容 |

7. 对单个 skill 打分（前提：可用 `uv`）

```bash
uv run plugin-eval score path/to/skill --depth quick
uv run plugin-eval certify path/to/skill
```

8. 可选：外部记忆集成 Pensyve（Claude Code 通过本市场 `integrations/claude-code` 安装；Codex/Cursor/OpenCode/Copilot 有各自 upstream 集成）

## 对应的研究问题

1. 能力发现：目录本身就是一张“还没想到要交给 AI 的工作”清单——202 个 agent 覆盖架构、语言、基础设施、安全、数据、ML、文档、商业、SEO；105 个 command 含脚手架、安全扫描、测试生成、基础设施搭建；16 个 orchestrator 做多 agent 协调（全栈、安全、ML、事故响应）。可以按目录逐条试装。
2. 任务匹配：Tier 0-4 给了“任务类型 → 模型档位”的明确映射（架构/安全/评审→Opus，文档/测试/调试→Sonnet，SEO/部署/内容→Haiku，数小时自主任务→Fable 5 且需 opt-in）。`docs/harnesses.md` 的能力矩阵给出同一份内容在不同工具下的差异：Cursor 复用 `.claude/`、Codex 尊重 8KB skill 上限并把 commands 转成 skills、OpenCode 从 `tools:` 白名单生成 `permission:` 块、Antigravity 用模型档位别名（inherit/flash/pro）。插件隔离意味着按需加载，减少上下文占用。
3. 条件供给：供给就是目录结构——agents/commands/skills 自动发现；skills 采用 progressive disclosure（激活时才加载）；权限由 `tools:` 白名单映射为 OpenCode 的 `permission:` 块。
4. 主动推进：证据偏弱。README 提到 hooks 的存在（skills-only 安装不含 hooks）、16 个 orchestrator 的多 agent 协调、Tier 0 面向“最长周期自主工作——大规模迁移、数小时运行”。但没有给出时间/事件/状态触发的具体配置细节。
5. 效果验证：plugin-eval 三层——静态层是确定性 lint（frontmatter、标题、链接），不做模型调用；LLM judge 由 Haiku 和 Sonnet 按 4 个维度打分，标注为实验性且未经人工标注验证；Monte Carlo 在生成提示上跑 50 或 100 次，同样标注实验性且未验证。另有 `make validate`、`make garden` 和 `docs/round-trip-results.md` 的真实 CLI 验证配方。

## 与已有做法的关系

- Claude Code（adopt）：本仓库的 source-of-truth 与原生目标，可直接 `/plugin marketplace add` 安装。
- OpenAI Codex（adopt）：列为 supported，从已提交 registry 安装；注意 8KB skill 上限与 commands→skills 的转换。
- Cursor（watch）：列为 supported，thin marketplace + curated rules，复用 `.claude/`。
- GitHub Copilot（drop）：仓库仍声明支持并生成 `.copilot/`，但项目清单已判为 drop；这条路径不必投入，两者存在需要留意的差异。
- OpenCode（watch）：supported，克隆 + make 安装，`permission` 块来自 tools 白名单。
- Agent skills（adopt）：仓库提供 184 个 skills，并有 `gh skill install` 与 `npx skills add` 两种安装路径，正好落在已有 adopt 的概念上，可作为技能的现成来源。

## 证据与局限

- 数据：GitHub stars 40,149（给定 metrics）。94 插件 / 202 agent / 184 skill / 105 command / 16 orchestrator 均为 README 自述，给出的材料中没有交叉验证。
- 属作者主张、非验证结论：“production-ready”、“idiomatic, harness-native artifacts（而非最低公分母翻译）”、“one source-of-truth, six target harnesses”；Pensyve 外部记忆集成的效果没有任何数据。
- 作者自认的局限：LLM judge 与 Monte Carlo 都标注 experimental，且“not validated against human labels”；Pensyve 尚未支持 Antigravity CLI 与 Pi。
- 缺失：没有单个插件的质量数据、没有与其他方案的基准对比、没有“用了之后结果改善多少”的案例或指标；Fable 5 / Opus 等档位的成本只有“premium cost / opt-in”的定性说法。
- 适用条件：需要对应 harness 的 CLI 与账号；Antigravity/OpenCode/Pi 需要 git + make；skills-only 路径需要 `gh` 或 `npx`。

## 怎么试、怎么验证

最小试用方式：

1. 只选一个与当前工作直接相关的单元（一个插件如 `python-development`，或一个技能如 `python-testing-patterns`），优先走 skills-only 的 `gh skill install` / `npx skills add`，避免一次性引入全部内容。
2. 在一个真实小任务上跑一遍，例如给现有 Python 模块补测试、或做一次安全扫描，保留装插件前的同任务结果作为基线。
3. 用 `uv run plugin-eval score <skill> --depth quick` 和 `make validate` 检查结构与质量，把 plugin-eval 的输出当筛子而不是结论（其 judge 与 Monte Carlo 层自认未验证）。
4. 检查“插件隔离”是否如描述般只加载自身组件，记录单次会话加载的 skill/agent 数量与上下文占用。

判断有没有改善的指标（需自建基线，材料未给现成指标）：

- 效率：同一任务的完成时间、返工次数，装前 / 装后各一次。
- 质量：测试通过率、代码评审意见条数、lint 或安全扫描发现数。
- 上下文与成本：单次会话加载的组件数量、token 或费用变化。
- 稳定性：同一提示重复 3-5 次的结果一致性。

判定规则建议：上述指标没有明确改善，或插件内容与团队既有约定冲突，就退回只用 skill 层，不引入 agent / command / hook。
