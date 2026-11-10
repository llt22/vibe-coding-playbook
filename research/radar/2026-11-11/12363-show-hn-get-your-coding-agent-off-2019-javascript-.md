# Show HN: Get your coding agent off ~2019 JavaScript, onto modern web primitives

- 结论：**值得一试**。在前端代码库上小范围试：先用 npx 跑 search/retrieve/legacy-scan 验证指南质量和旧模式命中情况，再决定是否 install 并接入日常编码智能体。理由是指令与流程都现成可照抄，但效果证据只有作者主张，需自行用前后对比验证。
- 原文：https://github.com/GoogleChrome/modern-web-guidance
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T21:14:58.544Z

## 是什么

Modern Web Guidance 是 Google Chrome 团队发起、Chrome / Edge / Firefox / MDN 团队与社区共同维护的一套「技能（skills）」，把 Web 平台新特性、最佳实践和浏览器兼容性数据打包成编码智能体可直接消费的指南。配套 CLI 提供四类动作：检索（search）、按 ID 取用（retrieve）、旧模式扫描（legacy-scan）、安装（install）。目标很明确——把编码智能体从 LLM 训练数据里的大量 2019 年前后写法，引导到现代 Web 原语上。

覆盖 250 项特性，分为 CSS 与布局（140）、HTML 与 DOM（36）、JavaScript 与 API（74，原文在此处被截断）。内容按六个方向组织：用户体验、CSS 布局、性能、表单与 UI、无障碍、内置 AI。

## 具体做法

前提：本机有可用的 Node.js / npx；有一个前端代码库；有一个能接受外部文本上下文的编码智能体。原文未给出 Node 版本要求。

1. 零安装试跑检索，确认指南库里有你要的东西（不需要先 install）：
```shell
npx modern-web-guidance@latest search "animate a dialog modal backdrop"
```

2. 按上一步返回的 ID 取完整指南正文：
```shell
npx modern-web-guidance@latest retrieve "animate-to-from-top-layer"
```

3. 扫描现有代码库里的旧模式，得到可改造清单：
```shell
npx modern-web-guidance@latest legacy-scan .
```

4. 确认有价值后再正式安装（交互式向导，按提示选择你的智能体/项目）：
```shell
npx modern-web-guidance@latest install
```

5. 把指南送进智能体上下文。原文的机制描述是「CLI 把针对性指南直接返回进 agent 的 context window」，但没有给出具体的提示词模板或配置文件格式；一种直接做法是把 `retrieve` 的输出贴进会话上下文或规则文件再让 agent 动手（此步为操作推断，非原文步骤）。

6. 让 agent 按指南实现时，同时要求它给出降级方案——原文明确把「Responsible Fallbacks」列为指南的三个重点之一：用轻量 fallback，而不是重 polyfill 或旧库。

7. 参考示例指南的写法，判断一份指南是否够具体（原文给出 `navigation-drawer` 指南作为样例，在仓库 `skills/modern-web-guidance/guides/ui-components/navigation-drawer.md`）。

## 对应的研究问题

- **能力发现**：原文点出了一个多数人不会想到交给 AI 的工作——对整个代码库做旧模式扫描（`legacy-scan`），产出「哪些地方可以现代化」的清单。
- **任务匹配**：定位很窄，是 Web 前端代码生成与重构，配合编码智能体使用。对后端、数据处理、文档写作等任务，本材料无任何依据。
- **条件供给**：这是本材料最实的一块。它把「模型缺什么」落成两件可操作的事：一是把 token-efficient 的专家指南按需检索、注入上下文（原文称已用评测剪掉模型本来就知道的内容）；二是附浏览器兼容性数据，支撑「负责任的降级」。对应研究中「给 AI 补领域知识 + 版本/环境信息」这一类条件。
- **主动推进**：只有间接依据。`legacy-scan` 属于由「代码库状态」触发的一次性扫描，原文没有描述定时触发、事件触发或持续运行的机制。
- **效果验证**：原文提供了 Eval Dashboard 链接，说明作者用评测来剪枝内容；但材料正文里没有任何评测数字，也没给出使用者自查的方法。

## 与已有做法的关系

清单中的相关条目：Claude Code（adopt）、OpenAI Codex（adopt）、Cursor（watch）、GitHub Copilot（drop）、Google Antigravity（watch）。

本条不是替代这些工具，而是叠加在它们之上的「领域指南层」：把专家指南经 CLI 送进 agent 的上下文，补的是知识与版本信息，不是推理能力。原文只泛称「coding agents」，未点名支持哪些产品，因此能否与清单里的具体工具对接需要实测。Copilot 在清单中状态为 drop，不必考虑。

## 证据与局限

**可核对的部分**：维护方名单（Chrome / Edge / Firefox / MDN + 社区）是可信度信号；提供了可点开的示例指南与 Eval Dashboard；特性清单具体到特性名，可逐条核对；HN 108 分、33 条评论说明有社区关注。

**只是作者主张的部分**：「编码智能体常默认老写法，因为训练数据里充满旧代码」「指南 token-efficient，已用 eval 剪掉模型已知内容」「避免臃肿 JS、性能与无障碍更优」——这些都是论断，材料未给任何量化对比（生成代码体积、Lighthouse/INP 改善、扫描误报率等）。仓库 README 本质是宣传材料。

**适用条件与未知项**：只适用于 Web 前端；依赖 Node/npx，安装需联网；原文未说明支持哪些智能体、Node 版本、私有环境或离线可用性、指南更新频率；`legacy-scan` 的判定规则来源和误报情况未知。原文特性列表在「Password credentials」处被截断，全貌未知。

## 怎么试、怎么验证

**最小试用**：挑一个小的前端任务（例如一个带动画的 dialog / popover），做两步对照——先让智能体裸做，再用 `search` + `retrieve` 取到相关指南后重做；同时对代码库的一个子目录跑 `legacy-scan`，记下命中点。全程不装东西也能完成，`install` 放到确认有用之后。

**判断有没有改善的指标**：

1. `legacy-scan` 在同一目录、同参数下的命中数，改造前后的变化。
2. 同一任务两次产出的可比项：JS 行数 / 产物体积、是否引入了 polyfill 或旧库、是否改用原生 API、键盘操作与屏幕阅读器可用性。
3. 出现「指南里写了但 agent 没用」的次数——这反映的是上下文注入方式的问题（条件供给没做到位），不是指南本身的问题，值得单独记。
4. 回归风险：现代 API 的浏览器支持范围是否满足你的目标浏览器矩阵（指南带兼容性数据，应以产品要求核对，不能默认可用）。
5. 由于材料未提供自动评分方法，建议把「是否按指南实现」做成人工评审 checklist，逐条勾。

官方 Eval Dashboard 可作为了解作者评测口径的参考，但材料未给出其中任何数字，不要引用。
