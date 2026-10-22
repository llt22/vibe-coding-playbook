# hassan-algo/open-sesame

- 结论：**值得一试**。建议先在合规的测试环境按 README 安装并小范围试用，重点验证授权门禁、WSTG 流程覆盖和双报告产出；暂不直接采纳为生产流程，因为输入只有 README，核心方法文件与评测数据未展开。
- 原文：https://github.com/hassan-algo/open-sesame
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-22T17:34:03.536Z

## 是什么
`open-sesame` 是一个面向 Claude Code 的 Web 应用渗透测试 Agent Skill。它由 Markdown 指令和小型辅助脚本组成，不涉及模型微调或二进制文件；按 README 描述，它让 Claude 在获得授权的目标上完成攻击面梳理、按 OWASP WSTG 逐项测试、用最轻量的安全证据验证发现，并生成面向工程师和管理层的报告。输入材料仅为 README，未包含 `SKILL.md`、`references/` 下的方法细节或评测结果原文。

## 具体做法
1. 前提：只对自有系统、有明确授权的客户项目、范围内的漏洞赏金目标或 CTF/练习实验环境使用；先确认范围和测试规则。需要 Claude Code、git；生成 PDF 时至少安装 Markdown→HTML 和 HTML→PDF 各一个后端（README 提到 `pandoc` 或 `npx marked`，以及 headless Chrome/Chromium、`weasyprint` 或 macOS `cupsfilter`）。
2. 克隆仓库：
```bash
git clone https://github.com/hassan-algo/open-sesame.git
```
3. 安装为项目级技能（只在当前仓库可用）：
```bash
cp -r open-sesame/.claude/skills/web-pentest .claude/skills/
```
或安装为个人级技能（所有项目可用）：
```bash
cp -r open-sesame/.claude/skills/web-pentest ~/.claude/skills/
```
4. 在 Claude Code 中用自然语言触发，或显式调用 `/web-pentest`。README 给出的示例提示词：
```text
Pentest my web app at https://staging.myapp.example — I own it. Start with recon.
```
也可以使用 README 列出的触发说法，如 “find vulns in my web app”、“test this endpoint for IDOR/SQLi”、“map the attack surface”、“write up this finding”、“validate this RCE”。前提是目标已获授权。
5. 按 README 描述的工作流执行：先确认授权、范围和规则；再做 recon；按 OWASP WSTG 覆盖配置、认证、会话管理、访问控制（含多租户隔离）、注入、错误/加密、业务逻辑、客户端和 API 测试；发现用最轻量的安全证明验证。具体测试项和工具命令在 `references/methodology.md`、`references/tooling.md` 中，输入材料未展开，不能据此复现细节。
6. 报告先写成 Markdown，再渲染为 PDF：
```bash
.claude/skills/web-pentest/scripts/render-report.sh report.md report.pdf
```
前提是已安装上述至少一种 Markdown→HTML 和 HTML→PDF 工具。
7. 技能采用渐进披露：`SKILL.md` 常驻加载，`references/` 按阶段需要再拉取，以控制上下文。该结构可作为设计长流程 Agent Skill 的参考。

## 对应的研究问题
- 能力发现：README 主张 AI 可承担完整的 Web 渗透测试流程，包括攻击面梳理、WSTG 测试、工具编排、发现验证和双受众报告；这提示可把“按标准清单执行的多阶段安全测试”交给 Agent Skill，而不只是让模型回答单点问题。但这是作者主张，输入未给出实际测试记录。
- 任务匹配：适合需要固定方法论、工具命令和报告模板的多阶段任务；载体是 Claude Code Agent Skill，用 Markdown 指令加辅助脚本，并用渐进披露减少上下文占用。README 没有比较不同模型或工具的适用差异。
- 条件供给：需要提供授权目标和范围/测试规则、Claude Code 环境、技能安装目录 `.claude/skills/`，以及报告渲染工具链；README 还提到 Burp Suite、ffuf、nuclei、sqlmap、nmap、subfinder/httpx 等工具，但具体驱动方式在未展开的 `references/tooling.md` 中。授权是硬前提。
- 主动推进：技能可由自然语言或 `/web-pentest` 触发，并按“确认范围→recon→WSTG→验证→报告”的流程推进；README 未描述按时间、事件或状态自动触发的机制，因此属于提示触发而非自动持续运行。
- 效果验证：README 称技能用 Anthropic 的 `skill-creator` 构建，并经过两轮 eval 迭代，覆盖方法论、报告、授权门禁、RCE/反弹 shell 指导、跨租户 IDOR 和范围纪律；仓库含 `evals/evals.json` 和 `evals/benchmarks/`。但输入未给出 benchmark 数字或失败案例，无法据此判断效果大小。

## 与已有做法的关系
清单中有 `Claude Code`（工具，状态 adopt）。`open-sesame` 是 Claude Code 的 Agent Skill，安装到 `.claude/skills/`，通过自然语言或 `/web-pentest` 调用，并采用渐进披露组织参考文件。它可作为在已采用的 Claude Code 上扩展“安全测试”领域工作流的参考；清单中没有其他相关条目。

## 证据与局限
证据主要来自 README：安装命令、触发提示词、目录结构、报告渲染命令、eval 文件位置和功能列表。局限是输入只有 README，未包含 `SKILL.md`、`references/methodology.md`、`references/tooling.md`、报告模板和 benchmark 结果，因此无法核验 WSTG 覆盖是否完整、工具命令是否安全、评测是否有效。README 中的“完整 OWASP WSTG 覆盖”“安全 RCE 验证”“授权优先”“双 PDF 报告”等均为作者主张，未附数据或案例。适用条件是仅限授权测试的 Web 应用，使用者仍需具备安全测试判断力并遵守法律和范围；报告脚本依赖外部工具。36 stars 只能说明关注度有限，不能作为质量证据。

## 怎么试、怎么验证
最小试用：在一个隔离仓库中按项目级方式安装技能，选择一个自有 staging 应用或 README 所述的合法练习实验环境，先只做 recon 和报告整理，再选一个范围明确、非破坏性的小测试项，不要直接上生产。用同一目标做一次“人工清单/无技能”基线对照。记录并比较：
1. 授权门禁：在未说明授权时，技能是否先询问范围和规则；对明确未授权的目标是否拒绝或停止主动测试（只做对话层测试，不实际扫描）。
2. 触发可靠性：README 列出的自然语言说法和 `/web-pentest` 是否能稳定触发。
3. 流程覆盖：实际执行的 WSTG 类别数、每类产生的证据质量，与人工基线相比是否不减少。
4. 发现质量：人工复核后的误报数、可复现发现数、是否坚持非破坏性验证、是否出现越界或未清理动作。
5. 报告产出：技术报告和管理层摘要是否可直接使用，`render-report.sh` 是否能在本机工具链下成功生成 PDF，耗时是否低于基线。
6. 若仓库内 `evals/` 可用，运行其自带评测并记录通过/失败项；输入未给出具体命令，需按仓库文件说明执行。
判断改善的建议标准：授权确认前不发起主动测试；与人工基线相比覆盖项不减少、误报不增加；至少产出一个有可复现证据的有效发现；报告无需大改即可交付；全程无越界和破坏性操作。达到这些条件再考虑扩大试用范围；若核心方法文件缺失或评测不可运行，则停留在 study/watch 层面。
