# mokevnin/dev-quality-gates

- 结论：**值得一试**。建议在单个代码库小范围试用：在仓库根目录让编码代理按 README 的提示词先出计划，只接入与项目栈匹配的少量质量门禁，并逐个证明能失败。理由是该仓库给出了可复制的代理提示词和按任务选工具的清单，但 adopt.md、patterns.md 未包含在材料中，且清单明确声明不是通用栈，需要先验证再推广。
- 原文：https://github.com/mokevnin/dev-quality-gates
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T07:12:31.554Z

## 是什么

Dev Quality Gates 是一份有明确取舍的开发质量门禁工具清单：不是 Awesome List，不追求列出每种语言的所有 linter，而是每个任务推荐一个工具（少数情况两个），说明为什么选它、它在哪里不适用。核心原则包括：按任务选一个工具、覆盖优先于数量、优先快速原生工具链、必须能阻断构建（非零退出码）而不只是出报告、对 AI 编码代理友好（非交互、机器可读输出、安全自动修复）、没有可靠推荐就留空。README 明确说这不是通用技术栈，不要全部安装。

它给出的主要用法不是让人手工逐个配工具，而是让编码代理在仓库根目录读取该清单和 adopt.md，检查项目、只挑适合的条目、先展示计划，再把检查接入 Git hooks 和 CI，并证明每个门禁都能失败。

## 具体做法

1. 前提：从目标仓库根目录开始；编码代理需要能读取 GitHub 原始文件、检查项目文件、修改仓库并运行项目命令。先让代理只出计划，不改文件。
2. 在仓库根目录向编码代理原样发送 README 给出的提示词：

```text
Apply https://github.com/mokevnin/dev-quality-gates to this repository.
Read and follow https://raw.githubusercontent.com/mokevnin/dev-quality-gates/main/docs/adopt.md.
Show me the plan before you change anything.
```

3. 审阅计划，不直接放行。按 README 原则检查：是否只选了与项目语言和跨切面风险匹配的条目；是否避免“全部安装”；是否优先能非零退出、对代理友好的工具；是否诚实标出没有可靠推荐的类别。
4. 计划确认后再让代理修改。README 描述的预期行为是：代理检查项目、只挑适合条目、把检查接入 hooks 和 CI，并证明每个检查都能失败。
5. 若手工执行：按语言和跨切面类别从清单中挑条目，再使用 README 指向的 `docs/patterns.md` 中的 setup patterns。注意：本次材料没有包含 adopt.md 和 patterns.md 的正文，因此无法从原文提取完整安装命令或配置。
6. 若采用 README 推荐的 toolchain 与 hooks 组合：用 `mise.toml` 固定工具版本，用 `hk.pkl` 让本地 hook 和 CI 跑同一套检查；CI 中运行全量检查，因为 hook 可被 `--no-verify` 绕过。原文给出的相关命令包括：

```text
mise use hk
hk check
hk fix
hk check --all
```

7. 对每个新接入的门禁做一次“能否失败”的验证：制造或选择一个已知违规，确认该检查返回非零退出码并阻断 CI；只出报告、不阻断的检查不算完成。

## 对应的研究问题

1. 能力发现：给出了可交给编码代理的一类完整工作——审计仓库、从清单中选择合适工具、先出计划、接入 hooks/CI、证明门禁能失败。这比“让 AI 写代码”更进一步，属于质量基础设施的代理化。
2. 任务匹配：核心方法是“每个任务一个推荐工具”，按语言（JavaScript/TypeScript、Python、Go、Rust、Ruby、PHP、Java、Kotlin、.NET、Swift、Elixir、Shell 等）和跨切面类别（密钥、漏洞、依赖更新、Docker/Terraform/Kubernetes、配置校验、策略、代理配置、工具链、Git hooks、提交规范、文档等）匹配。README 反复强调限制和不适用条件，避免一个工具包打天下。
3. 条件供给：需要仓库根目录、代理对文件和命令的读写执行权限、访问 GitHub 原始文件的能力、修改 hooks 和 CI 配置的权限，以及人工审阅计划的环节。工具侧要求非交互、机器可读输出、安全 autofix；版本和 hooks 可用 mise/hk 固定与统一。
4. 主动推进：门禁可由 Git 提交、hook 和 CI 事件触发；Renovate 可持续开依赖更新 PR，但它本身不是门禁，需要配合 CI 检查。清单本身声称持续策展并定期复查工具。
5. 效果验证：判断标准不是“有没有报告”，而是违规时是否非零退出并阻断构建；“证明每个门禁能失败”是可操作的验收动作。清单中还有按变更行覆盖率门禁的 diff-cover、包体积/加载时间预算的 size-limit 等具体验证工具。

## 与已有做法的关系

- Claude Code（adopt）：直接相关。README 的用法就是让 coding agent 执行，Claude Code 可作为执行代理；提示词明确要求先展示计划再修改。
- ast-grep（try）：清单在 Custom rules 类别中推荐 ast-grep，用 YAML 写项目特定语法规则，并用 `ast-grep test` 测试规则本身；适合补充项目自定义门禁。
- Atlas（watch）：清单在数据库部分提到 Atlas 做结构 diff/drift 是不同任务；在 squawk 条目中明确说 Atlas lint 未被采用，因为更强检查需要 Atlas Pro 和登录。
- Cursor（watch）、OpenCode（watch）：关系较弱，仅在 agnix 条目中被提到——agnix 可 lint 这些代理工具的配置；该仓库本身不是 Cursor/OpenCode 的工作流指南。

## 证据与局限

- 本次只能依据 README 判断；adopt.md、patterns.md、tools.json 和 research 目录正文未包含，原文还在 Under review 表格处被截断。因此无法核对完整接入步骤、具体配置和逐条研究证据。
- README 说所有条目在 2026-10-23 做过一次检查，但这是一次 sweep，不是独立评审；部分结论来自实际运行工具，部分只依据文档和仓库活跃度。
- 多个推荐工具较新、pre-1.0 或由单一维护者维护；README 自己也标注了限制，例如部分工具未验证退出码、部分工具由仓库所有者维护、部分工具需要额外插件或付费能力。
- 没有给出采用后代码质量改善的量化数据；主要论据是设计原则、工具限制说明和少量实测标注。适用条件是已有 hooks/CI、使用编码代理、并愿意按项目栈挑选少量门禁的团队；小项目全量套用会过重。

## 怎么试、怎么验证

1. 选一个真实仓库，先只覆盖一个主语言加一个跨切面风险类别（例如密钥扫描或依赖漏洞），不要全量安装。
2. 在可回滚的工作分支上运行 README 提示词，要求代理只输出计划；审阅计划是否满足“只选匹配条目、能非零退出、先证明能失败”。
3. 先批准 2 到 3 个最匹配的门禁，让代理接入 hooks 和 CI；对每个门禁制造一次已知违规，确认本地 hook 或 CI 确实失败。
4. 记录指标：计划中推荐数、实际接入数、成功证明能失败的数量、误报数量、CI 时长变化、修复一个违规所需时间。核心判断是“违规能否被稳定阻断”，而不是“报告是否好看”。
5. 若至少一个门禁捕获了真实问题或成功拦截构造违规，且误报和 CI 延迟可接受，再扩大到更多类别；若代理倾向安装过多工具、或门禁无法失败，则停止推广，只保留已验证的单个工具。
