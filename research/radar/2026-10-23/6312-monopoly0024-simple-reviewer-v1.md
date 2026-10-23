# Monopoly0024/simple-reviewer-v1

- 结论：**值得一试**。建议把它作为 Codex 编码代理的“先审阅、后验收”环节小范围试用：按 README 安装完整技能，用目标定义验收项并声明只审不改，再运行报告生成与示例校验。理由是它给出了可复制的安装、调用、报告生成和证据快照流程，但生成器只校验记录、不执行检查，且仓库未附开源许可证，采用前需确认授权并用自有代码验证效果。
- 原文：https://github.com/Monopoly0024/simple-reviewer-v1
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T11:49:41.177Z

## 是什么

Simple Reviewer 是一个 Codex skill，面向使用 AI 编码代理的人。它把 AI 编写或修改的代码按职责拆成功能块，说明每块的作用、输入输出、源文件/符号/行号，并用可复核的运行证据检查实现是否满足目标。默认生成 `code-breakdown.html` 和 `code-breakdown.md`；需要完整审查时生成 `report.html`、`report.md`、`review.effective.json`。

它的核心用途不是替人改代码，而是在 Vibe Coding 后、接手不熟悉的 AI 代码时、接受修改前，先读懂代码，再核对目标和证据。原文明确说：生成器只校验和渲染作者写好的审查记录，不执行记录内命令，也不自行发现语义缺陷；实际检查由审查代理读取代码、运行适当检查并记录结果。

## 具体做法

1. 前提：准备 Codex 环境、Python 3；浏览器自检还需要 Node.js 和 Playwright。复制完整 `simple-reviewer-v1` 目录到 Codex 个人 skills 目录，不要只更新单个 `SKILL.md`。Windows 默认路径为：

```text
%USERPROFILE%\.codex\skills\simple-reviewer-v1
```

2. 安装后在 Codex 中新开会话或刷新 skill 列表，然后调用。可原样使用中文提示词：

```text
$simple-reviewer-v1 检查刚刚的代码，并单独生成代码拆解文件。
```

也可使用带验收要求的英文提示词：

```text
$simple-reviewer-v1 Review the code we just changed. Explain each functional block, identify its source locations, verify whether it meets my goals, and generate an HTML breakdown with a Markdown companion. Review only; do not change the code.
```

前提：先把代码和希望实现的目标交给 skill；默认输出简体中文，需要英文要显式要求。

3. 在仓库目录运行 Python 标准库测试、校验示例记录并生成报告：

```text
python -B scripts/test_reviewer_report.py
python -B scripts/reviewer_report.py validate assets/review.example.json
python -B scripts/reviewer_report.py breakdown assets/review.example.json --out review-output
python -B scripts/reviewer_report.py render assets/review.example.json --out review-output
```

前提：Python 3；生成器只用标准库。`breakdown` 生成 HTML 和 Markdown；`render` 额外生成完整审查文件。打开 `review-output/code-breakdown.html` 查看图文拆解。

4. 用内置订单导出示例验证工具链。该示例故意保留“复用列表分页导致超过 20 条时导出不完整”的缺陷，可重建可复现证据：

```text
python -B assets/order-export/build_example.py
```

前提：这是示例，不是自己项目的检查结果。

5. 可选做浏览器自检，验证 HTML 的源码展开、键盘导航、筛选、离线请求和多宽度布局：

```text
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node scripts/test_breakdown_browser.cjs review-output/code-breakdown.html review-output/browser
```

前提：Node.js 和 Playwright；报告生成器本身不需要它们。

6. 已有安装需要更新时，在此仓库运行：

```text
powershell -NoProfile -File scripts/sync-installed-skill.ps1
```

前提：脚本安装完整新版并校验文件哈希，把旧安装备份到启用中的 skills 目录之外；更新后新开 Codex 对话使用新调用名。

7. 审阅时遵守状态含义：绿色表示在所记录范围内实际验证通过，红色表示有证据确认的问题，黄色表示待核实，灰色表示尚未验证。静态阅读不算运行通过；缺少运行条件要明确记录为未验证。源文件或证据日志被改动后，SHA-256 快照会使旧证据过期，需要重新验证。

8. 采用前确认许可证。原文写明当前版本未附开源许可证，版权及复用权限仍由权利人保留，除非作者另行添加许可证。报告可能包含源码和本地路径，按项目约定保存和分享。

## 对应的研究问题

- 能力发现：可把“AI 写代码后的审阅和验收”交给编码代理辅助完成，包括按职责拆解功能块、定位源文件/符号/行号、生成图文拆解和 Markdown 报告、按验收项核对目标是否完成。原文还提供证据状态和 SHA-256 快照过期重验机制。
- 任务匹配：适合 Codex 编码代理的审阅/验收环节，尤其适合 Vibe Coding 后、接手不熟悉的 AI 生成代码、接受修改前。生成器只负责校验记录和渲染，不执行命令、不自动发现语义缺陷；实际检查由审查代理完成。需要 Python 3，浏览器检查另需 Node.js 和 Playwright。
- 条件供给：需要提供代码、目标/验收标准、完整 skill 目录、Codex 会话、Python 3 运行环境；可选提供 Node.js/Playwright。审查代理需要能读取代码、运行适当检查并记录结果；报告生成需要符合规范的 review 记录。反馈通过颜色状态、证据、限制说明和哈希快照体现。
- 主动推进：提供多条可脚本化命令，包括测试、validate、breakdown、render、示例构建、浏览器测试和安装同步；CI 在 Windows/Linux 运行 Python 测试，并在 Chromium 检查报告。SHA-256 快照可检测源文件或证据日志变更并要求重验。但原文没有把它描述成持续后台自动审阅服务，主要是命令/CI 触发。
- 效果验证：先依据目标建立验收项，再用绿色/红色/黄色/灰色区分验证状态；要求把结论连接到实际观察、证据和验证限制。内置示例故意包含分页缺陷，可用于检验审查是否能发现并标记问题。判断是否改善应看验收项覆盖、确认问题数、未验证项是否明确、证据是否可复核，而不是只看报告是否生成。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

原文给出的证据包括：完整安装路径和调用名、可复制的 Python 测试与报告生成命令、`code-breakdown.html/md` 与完整报告文件清单、内置订单导出分页缺陷示例、SHA-256 快照机制、CI 在 Windows/Linux 和 Chromium 中检查源码展开、键盘导航、筛选、离线请求及 390/700/1024px 布局、版本 1.1.0、更新脚本和许可证声明。输入指标显示仓库有 129 stars。

局限：这些主要是 README 自述，没有独立评测或实际改善效果数据；生成器不执行记录内命令，也不自行发现语义缺陷，不能把“生成报告”等同于“验证通过”；颜色只代表所记录范围内的状态，缺少运行条件时必须保留未验证；内置示例不是自己项目的证据；仓库未附开源许可证，直接复用前需确认授权；报告可能含源码和本地路径，有分享风险；默认简体中文，且依赖 Codex 技能环境。

## 怎么试、怎么验证

最小试用：选一个 1 到 2 个文件的小改动，先写 3 到 5 条可观察的验收标准；按 README 安装完整技能，用提示词要求“只审不改”；运行 `test_reviewer_report.py`、`validate`、`breakdown`、`render`，打开 `code-breakdown.html` 检查每个功能块是否有职责、文件/符号/行号、源码片段、证据和限制。

再做一个负向测试：在试用代码中故意放入一个可复现的小缺陷，参考订单示例的分页问题，观察审查是否把它标为红色并提供证据，而不是只做静态阅读后标绿。修改源文件后检查 SHA-256 快照是否使旧证据过期并要求重验。

判断指标：验收项覆盖比例；绿色状态是否都有命令输出、日志或截图等可复核证据；确认问题数；未验证项是否被明确写出；同一改动在人工审阅和 skill 审阅下的缺陷发现数与耗时对比；报告是否可离线打开、导航和筛选是否正常。记录基线和试用结果，不预设数值阈值。
