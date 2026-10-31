# ngocanhnckh/renderlint

- 结论：**值得一试**。建议在一个前端项目里小范围试用：按原文把 init 跑起来，并把“UI 改动后 npx renderlint 必须 0 error”设为门禁；原因是原文给出了可直接复制的命令、配置、代理提示词和量化验证口径，但效果数据全部来自作者自测、工具尚未发布到 npm，误报率与耗时需自行验证。
- 原文：https://github.com/ngocanhnckh/renderlint
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T00:07:36.879Z

## 是什么

renderlint 是一个“渲染后 UI 的 linter”：它在无头 Chromium 中打开真实页面，在手机/平板/桌面多视口（含暗色模式）下渲染，检查 37 条规则，抓 TypeScript 与 ESLint 看不见的像素级缺陷——文字溢出卡片/被 `overflow:hidden` 截断、灰底灰字对比度不足、图表标签重叠、只在 1024px 才坏的布局、`$undefined`/`NaN%`/`Invalid Date` 占位文本、emoji 当图标、图片变形、下拉箭头压在边框上、复选框离标签太远、缺焦点环、tap target 太小、`href="#"` 死链、hydration 报错、404、被登录页挡住的页面等。

它的输出是给 agent 读的纯文本（也支持 JSON / markdown / GitHub PR 注解），每条发现带元素选择器、源文件与行号、带标注的截图和一条具体修复建议；有 error 时进程退出码为 1，因此可以直接当作构建/提交门的门禁。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提确认**：Node >= 18.17；项目能在浏览器里渲染（React / Next.js / Vue / Nuxt / Svelte / Astro / Angular / Solid / Qwik / Remix / WordPress / 纯 HTML 均可）；能启动 dev server，或能产出静态构建目录。

2. **最省事的方式：把这段话原样丢给编码代理**（Claude Code、Cursor、Codex、Copilot、Gemini CLI、Windsurf、Aider、Zed、Amp…）：

```
Set up renderlint in this project: run `npx -y github:ngocanhnckh/renderlint init`, then follow the "UI quality gate: renderlint" section it adds to AGENTS.md: after every UI change run `npx renderlint` and fix every reported error until it shows 0 errors.
```

3. **或手动执行**（注意：目前未发布到 npm，必须从 GitHub 安装）：

```bash
npx -y github:ngocanhnckh/renderlint init   # one-time setup: config, build gate, agent instructions, Claude Code hook
npx renderlint                              # check: exits 1 if any error is found
```

4. **知道 `init` 会改什么**（原文列出的 6 项，便于事后 review diff）：
   1. 加 renderlint 为 dev dependency（纯 HTML 站点会新建 `package.json`）；
   2. 写 `renderlint.config.json`，指向你的 dev 命令或静态目录；
   3. 加 `lint:ui` script，并把检查追加到 `build`（`--no-build` 可跳过）；
   4. 把 agent 工作流写进 `AGENTS.md`，并创建/追加 `CLAUDE.md`；
   5. 在 `.claude/settings.json` 装 Claude Code 的 `Stop` hook（`--no-hook` 可跳过）；
   6. 把 `.renderlint/` 加进 `.gitignore`，并确保有可用的无头 Chromium。
   `init` 是幂等的，可重复运行。

5. **按项目定制配置** `renderlint.config.json`（原文示例，直接照抄改值）：

```json
{
  "serve": "npm run dev",
  "pages": ["/", "/pricing"],
  "viewports": [375, 768, 1280],
  "colorSchemes": "auto",
  "rules": { "line-length": "off", "tap-target": "error" },
  "ignore": [{ "rule": "contrast", "selector": ".legal-footnote" }],
  "states": [{ "name": "account menu", "click": "[aria-label=Account]", "waitFor": "[role=menu]" }],
  "mock": { "**/api/notifications*": [] }
}
```

6. **把业务上限显式声明出来**，让“长内容压力测试”测的是真实最坏情况（该属性在生产环境无作用）：

```html
<h3 data-renderlint-maxlength="60">{project.name}</h3>
```

7. **登录后的页面**：给路由守卫读的 token + mock API，不需要真实凭据：

```json
{
  "pages": ["/dashboard", "/accounts"],
  "auth": { "storage": { "sessionStorage": { "acme.token": "test-token" } } },
  "mock": { "**/api/me": { "name": "Dana" }, "**/api/accounts": "fixtures/accounts.json" }
}
```

   也可以走登录表单一次（`"auth": { "login": "/login", "user": "${RENDERLINT_USER}", "password": "${RENDERLINT_PASSWORD}" }`）或跑脚本处理 SSO；hash 路由会被当作独立页面爬取，登出链接不会被跟随。

8. **让菜单、弹窗、表单、空/失败状态也进检查**（默认只检查加载完成时的页面）：用配置里的 `states`（点开菜单、填表单、喂空或失败 API 响应）。

9. **接成门禁，让缺陷发不出去**（原文表格里的四类接法）：
   - 构建脚本：`"build": "vite build && renderlint dist"` 或 `"build": "next build && renderlint --serve \"npx next start -p 4319\" --url http://localhost:4319"`；
   - Vite：`import renderlint from 'renderlint/vite'`，把 `renderlint()` 加进 `plugins`，`vite build` 有 error 即失败，dev 下出实时 overlay；
   - Claude Code：`init` 装的 `Stop` hook（`npx renderlint hook`），UI 文件有错时 Claude 不能结束回合，最多重试 4 次，不会卡死；
   - CI：`npx renderlint --format github` 出 PR 内联注解；
   - 任意打包器 dev 环境：`import('renderlint/client').then((m) => m.start())` 加实时 overlay。

10. **常用命令**（内环提速用 `--sweep` / `--no-sweep`）：

```bash
npx renderlint http://localhost:3000            # any running app
npx renderlint dist                             # a static build (served for you)
npx renderlint index.html about.html            # plain files
npx renderlint --serve "npm run preview" --url http://localhost:4173
npx renderlint --pages /,/pricing,/dashboard --viewports 360,768,1440
npx renderlint --sweep 1024,1366                # only these extra widths (--no-sweep to skip)
npx renderlint explain contrast                 # what a rule means and how to fix it
```

11. **对确认是故意的缺陷做显式豁免**（等同于 `eslint-disable`，要写理由）：

```html
<div data-renderlint-ignore="emoji" data-renderlint-reason="user-generated chat">…</div>
<p data-renderlint-ignore>…</p>                          <!-- all rules, this subtree -->
```

```css
.watermark { --renderlint-ignore: contrast; }            /* works from CSS, inherits */
```

```js
const greeting = '👋 Welcome'; // renderlint-ignore emoji   (static source scan)
```

   或在配置里按选择器/页面忽略：`"ignore": [{ "rule": "contrast", "selector": ".legal" }, { "rule": "dead-link", "page": "/blog/*" }]`。agent 指令要求先修根因、忽略必须带 reason。

12. **需要程序化调用时**：

```js
import { check, formatPretty } from 'renderlint';

const result = await check({ targets: ['http://localhost:5173'], config: { viewports: [390, 1440] } });
console.log(formatPretty(result));
process.exit(result.ok ? 0 : 1);
```

13. **跑通后的循环**：改 UI → `npx renderlint` → 按报告里的元素、文件:行号、截图和 fix 提示逐条修 → 直到 0 error。每轮产物落在 `.renderlint/report.json`、`.renderlint/report.md`、`.renderlint/screens/`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做哪些还没想到交给它的工作）**
原文明确划出了一块此前很少交给 AI 的工作：**渲染结果的像素级质检**。理由是“代码是合法的，坏的是像素”，TypeScript/ESLint/axe/Lighthouse 都看不到溢出、重叠、截断、渐变上的对比度。更进一步，它把“开发时屏幕上没有的内容”也纳入了自动检查：13 档宽度（320–1920px）加每个断点两侧扫描、文本加长 50%、长单词替换成 36+ 字符无断点串、KPI/价格/计数器多三位数字、把页面拉到的 JSON 换成长名称/标题/邮箱后重载、按 `data-renderlint-maxlength` 声明的真实上限测。这类“压力内容生成 + 自动判定”是可以整块交给机器的。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 视觉缺陷判定适合**确定性规则工具**，不适合让模型“看图猜”：原文 37 条规则、按真实像素算对比度、按几何算溢出与遮挡。
- 输出为纯文本/JSON/markdown/GitHub 注解，明确面向 agent 消费；带标注截图供有视觉能力的 agent（和人）查看。
- 协作方式按宿主分层：Claude Code 用 `Stop` hook 强制闭环（仅当 UI 文件变更才跑，最多 4 次防卡死）；Codex/Cursor/Copilot/Gemini/Amp/Zed 等通过 `AGENTS.md` 读工作流；Vite 用户在 dev 里拿实时 overlay 与 `file:line`。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 工具：可启动的 dev server 或静态构建目录；无头 Chromium（`init` 会确保可用）。
- 信息：`pages`/`viewports`/`serve` 配置；业务字段的真实上限（`data-renderlint-maxlength` / `data-renderlint-sample`）；登录态 token 存哪个 storage key，或登录凭据（`RENDERLINT_USER` / `RENDERLINT_PASSWORD` 环境变量）；API mock 的 fixtures。
- 权限：能读源码（映射 `src/components/Hero.tsx:42` 这类定位）、能跑构建、能在 CI 里跑。
- 反馈：每条缺陷给出“元素 + 源文件 + 截图 + 具体 fix”（如 `use text #2e2e2e (currently #ffffff on #459bf4)`），这正是让 agent 能自我修正的最小反馈单元。

**4. 主动推进（可由时间、事件或状态触发并持续完成）**
- **事件触发**：UI 文件变更后自动跑（Claude Code `Stop` hook、Vite 插件、`build` 脚本追加检查）；CI 上以 PR 注解形式跑。
- **状态触发**：`states` 定义“点开账户菜单并等 `[role=menu]`”“填表单”“喂空/失败 API 响应”后再检查；`auth-required` 会把“只看到登录表单”的页面显式报出来，而不是静默通过。
- **阻断语义**：有 error 即退出码 1，可挂在任意步骤上（构建、hook、CI），形成“不修完不能结束/不能合入”的持续闭环。

**5. 效果验证（怎样判断确实改善了结果）**
- 单次运行的判据就是 **0 error**，且报告里有可核对的截图编号与源文件位置。
- 原文给出的对照实验：22 个无头 Claude Code 会话（Opus 与 Haiku），覆盖 landing page、dashboard、kanban、天气应用、SVG 组织图与分析图表，技术栈含 HTML/React/Next.js/Vue/Svelte；其中 11 个基线应用合计 **229 errors**（以 WCAG 对比度失败为主，另有 emoji 图标和图表标签截断），另外 11 个用了 renderlint 的应用**全部收敛到 0 errors**（agent 自己修的）；改用宽度扫描、额外压力 profile 和表单规则重新打分后，renderlint 组为 **5 个应用 11 errors**（全部为真实缺陷，且当时都不可检——9 个只在 320–360px 出现），基线组为 225 errors。
- 另一个对照：同一 weather-app prompt，无 renderlint 42 个对比度错误，有则 0。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（清单状态：adopt）**：直接相关。`init` 会写 `CLAUDE.md` 并在 `.claude/settings.json` 安装 `Stop` hook（`npx renderlint hook`），使 Claude 在 UI 文件仍有错误时无法结束回合，最多重试 4 次；这是把“渲染后自检”嵌进现有 Claude Code 工作流的现成接法。
- **Cursor（清单状态：watch）**：相关但较弱。Cursor 通过 `AGENTS.md` 读取 `init` 写入的 “UI quality gate: renderlint” 工作流，属于文档级集成，原文没有给 Cursor 专属配置。
- 其余条目：清单中没有相关条目。
- 与其他工具的定位区分（原文自述，可作为手册中“别拿它替代什么”的对照）：ESLint/stylelint/TypeScript 读源码、不看像素；axe-core/Lighthouse 读 DOM 与计算样式，渐变/图片上的对比度只能标“needs review”；视觉回归（Percy、Chromatic、BackstopJS、Playwright 截图）需要基线，只能告诉“变了什么”而非“哪里错了”，且第一版的缺陷会被固化成基线。renderlint 不替代它们，补的是“代码合法”与“看起来对”之间的缝。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据/案例**：22 个无头 Claude Code 会话的对照（11 基线 229 errors → 11 个 0 errors；重打分后 11 vs 225）；同一 weather-app prompt 的 42 → 0 对比图；hero 图列出的 6 个溢出 bug（含 Elementor 页面与 headless 会话产物）；一个故意做坏、能触发 22 条规则的 demo 页；WordPress/Elementor 场景能命名 widget 并给出编辑器直链的示例输出；真实 CLI 输出样例（`contrast` 2.66:1 需 4.5:1、`text-clipped` 1024px 溢出 12px）。

**属于作者主张、未给量化支撑的部分**：“37 条规则经过调优，命中几乎总是真实缺陷”“为低误报率调优”——没有给误报率数字；“大部分布局 bug 出现在开发时屏幕上没有的内容里”——无统计来源；`How it compares` 表格中对竞品的判定为作者自述，无第三方评测。

**原文自陈的局限（直接决定适用条件）**：
- `<canvas>` 图表（Chart.js、ECharts canvas 模式）是像素，标签无法被检查，需改用 SVG 渲染器或依赖图表库自身避让；
- 页面按加载时状态检查，菜单/弹窗/tab/空态/错误态必须写进 `states` 才会被覆盖，登录后页面必须配 `auth`；
- 对比度按 WCAG 2 AA 计算，不建模字重（除大字号规则）、不采用 APCA；
- 性能：单页在三个视口加扫描与压力检查约 4–10 秒；站点级因并行与相同页面复用而更快，内环可用 `--sweep 1024` / `--no-sweep` 提速。

**额外风险（据原文事实推断）**：尚未发布到 npm，需 `npx -y github:ngocanhnckh/renderlint init` 从 GitHub 安装，版本可追溯性与供应链需自行评估；仓库 32 stars，属于早期项目；效果数字来自作者自测，未见独立复现。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**
1. 选一个真实前端项目（最好含 dashboard/表格/图表这类“内容会变长”的页面），先只跑一次不改任何门禁：
   ```bash
   npx -y github:ngocanhnckh/renderlint init --no-hook --no-build
   npx renderlint --pages / --no-sweep
   ```
   先单页、关掉扫描，确认能跑通、耗时可接受。
2. 看首轮报告：记录 error/warning 总数，并**人工核对前 10 条**——是不是真缺陷？截图能不能定位？fix 提示是否可执行？这一步就是测误报率。
3. 把 `--no-sweep` 去掉、加 `--pages` 覆盖 2–3 个关键页，重跑；重点看有没有**只在 320–360px 或只在上限文案下**才暴露的问题（这是人力走查最容易漏的部分）。
4. 让 agent 按报告修到 0 error，观察它能否只靠“元素 + 文件:行 + 截图 + fix”完成闭环，还是需要人再解释。
5. 满意后再接门禁：先在 CI 用 `--format github` 观察一周，再加 `Stop` hook / `build` 追加检查。

**判断有没有改善的指标**
- **有效性**：首轮 error 数中，人工确认为真实缺陷的比例（误报率 = 1 − 该比例）；修复后是否真的到 0，且修复没有引入新 error。
- **增量价值**：有多少条缺陷是人工走查/现有 ESLint、Lighthouse、视觉回归**没发现**的（尤其 320–360px 与长内容场景）。
- **成本**：单页耗时（对比 `--sweep` 与 `--no-sweep`）、CI 增加时长、agent 会话因 hook 多花的回合数。
- **流程效果**：agent 会话里“自己发现并修好”的比例；上线后视觉缺陷/UI 回归类 issue 数量是否下降；构建门禁拦截次数。
- **可维护性**：`ignore` 条目增长的速度与是否都带了 reason（豁免泛滥说明规则与业务不匹配）。
- **止损条件**：若人工核对前 10 条中真实缺陷不足一半，或单页耗时不可接受，就先只保留 `--pages` + `--no-sweep` 的本地内环用法，不进门禁。
