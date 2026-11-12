# Modern Web Guidance 1.0: The web platform expertise your coding agent is missing

- 结论：**值得一试**。建议在 Web 前端项目中小范围试用：按原文命令安装 Modern Web Guidance，并让编码智能体在现有代码库上执行现代化检查，同时用 Chrome DevTools for agents 做运行时验证。理由是原文给出了可复制的安装/更新命令和 agent 工作流，但效果数据主要来自厂商案例，且只适用于 Web 前端任务。
- 原文：https://developer.chrome.com/blog/modern-web-guidance-v1
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T09:30:35.455Z

## 是什么
Modern Web Guidance 1.0 是 Chrome 推出的、面向编程智能体的 Web 平台技能包与指南集，把 Web 最佳实践、Baseline/浏览器兼容数据和专家审核过的指南注入编码智能体。1.0 增加了对现有代码库的现代化工作流，并可与 Chrome DevTools for agents 配合做运行时验证。

## 具体做法
1. 前提：在 Web 前端项目目录中，具备 Node/npx，且使用的编码智能体支持技能、插件或命令行工作流。原文点名可通过 Claude Code、Codex、Cursor、Antigravity、Copilot、WebStorm、Kimi Code、Grok Build 等插件市场安装或更新。
2. 安装：在项目根目录执行：
```bash
npx modern-web-guidance@latest install
```
3. 已安装旧版则更新：
```bash
npx modern-web-guidance@latest update
```
4. 让智能体做现有代码库现代化：在智能体会话中执行：
```text
/modern-web-guidance Modernize the code in this directory
```
原文说明该流程会分析 HTML、CSS、JavaScript 和 package.json，寻找安全的现代化机会并引导智能体修改；1.0 先用静态分析覆盖有限模式，结果较可预测。
5. 在生成或修改代码时，让智能体依据项目浏览器兼容目标选择最适合的 Web 功能，优先考虑原生 HTML/CSS 能力而非自定义 JS；指南内置 Baseline 和浏览器兼容数据。原文提到可用 CLI 搜索用例和新技术，但未给出具体搜索命令。
6. 与 Chrome DevTools for agents 配合验证：MWG 负责给出写法建议，DevTools for agents 负责运行、调试、性能追踪、动画录屏、减少动态偏好检查和内存检查。原文给出的搭配场景包括：低端 CPU 模拟性能追踪，迭代到长任务不超过 50ms；录制并检查弹窗/对话框动画及 prefers-reduced-motion；检查 SPA 视图缓存是否导致内存无界增长。
7. 团队评审场景：原文称 MetaMask 把 MWG 作为每个 PR 的自动评审机器人，配置为三行指令，但原文没有给出这三行指令原文；因此只能照做自动 PR 评审的思路，不能照抄其提示词。

## 对应的研究问题
- 能力发现：可让编码智能体承担 Web 平台最佳实践审查、现有代码现代化扫描、PR 自动评审，以及可访问性、性能、安全写法建议。原文案例包括 MetaMask 的 PR 评审 bot、WeTV 在 CI/CD 中诊断性能回归、note 用 MWG 改造 Next.js 前端。
- 任务匹配：适合 Web 前端编码任务，尤其是 HTML/CSS/JS/package.json 现代化、可访问性、对话框与弹窗动画、滚动与滑动交互、性能长任务拆分、SPA 视图缓存、表单/autocomplete/passkey 等；与 Chrome DevTools for agents 搭配适合需要运行时验证的任务。原文没有覆盖非 Web 任务。
- 条件供给：需要项目目录、Node/npx、编码智能体；需要项目的浏览器兼容目标，因为指南按 Baseline 和兼容数据给建议；需要给智能体项目上下文和修改权限；若要验证运行时，需要 Chrome DevTools for agents；PR bot 场景需要能接入 PR 的自动评审配置，但原文未给具体配置。
- 主动推进：原文支持在现有代码库上由命令触发现代化扫描；MetaMask 案例是每个 PR 自动触发评审；WeTV 案例是 CI/CD 中自动诊断性能回归。没有给出时间或状态触发器的通用配置。
- 效果验证：原文给出公开评估面板和案例指标：Pensionbazaar 交付从约 4 天降到几小时、UI 错误降 90% 以上；Policybazaar 手动审计工作量降 92%；WeTV 90% 的失败性能检查可自动诊断解决、调试时间降 87%；note 现代 Web 检查通过率从 61% 到 94%、LCP 图片优先级提升 28%；MetaMask 5 周约 480 个 PR、64 条评论、43 个修复、中位 15 分钟修复。上述均为厂商或客户自报，需自行复测。

## 与已有做法的关系
清单中有 Claude Code（adopt）和 Cursor（watch）。原文明确把 Claude Code、Cursor 列为可通过插件市场安装或更新 MWG 的编码智能体，因此 MWG 是对已有编码智能体的 Web 平台知识与评审层补充，不替代 Claude Code 或 Cursor。对已采用 Claude Code 的团队可在其工作流中加装试用；Cursor 目前清单为 watch，可把 MWG 作为观察 Cursor 在 Web 前端任务中表现的一个增强项。清单中没有其他相关条目。

## 证据与局限
- 证据：原文给出 1.0 功能清单、安装与更新命令、现代化斜杠命令、与 Chrome DevTools for agents 的具体搭配场景，以及多个公司案例和量化指标。
- 局限：这是 Chrome 官方博客和产品公告（材料为西班牙语页面），案例和指标为厂商或客户自报，原文未提供独立复现实验；提到的公共评估面板和 GitHub 仓库未在材料中展开；数百个知识缺口、完整评估覆盖等属于作者主张；现代化工作流首版只做有限模式的静态分析；MetaMask 的三行指令未给出原文；文章没有给出非 Web 工作的做法。适用条件：Web 前端项目、使用支持技能或插件的编码智能体、有明确的浏览器兼容目标；若要运行时验证还需 Chrome DevTools for agents。

## 怎么试、怎么验证
最小试用：
1. 选一个已有 Web 前端仓库，建分支，记录基线：构建、测试、lint 结果，并选 3 到 5 个代表性任务或 PR。
2. 在项目根目录执行安装命令；若已装旧版执行更新命令。
3. 让智能体执行 `/modern-web-guidance Modernize the code in this directory`，只处理小范围目录或文件，人工审查 diff，运行构建和测试。
4. 对同一批任务，在安装 MWG 前后使用相同提示和模型/智能体设置，记录修改轮次、人工 review 意见、返工次数。
5. 若可用 Chrome DevTools for agents，按原文场景验证：低端 CPU 性能追踪看长任务是否不超过 50ms；录屏检查动画和 prefers-reduced-motion；检查 SPA 视图缓存内存是否无界增长；检查键盘焦点、表单可访问性等。
6. 指标：现代 Web 检查通过率、PR 评审发现数与修复数、从评论到修复时间、UI 错误数、性能检查失败率、长任务与 INP 相关指标、LCP 图片优先级、人工审计工时、构建测试回归。只有相对基线有改善且无回归，才扩大范围。
