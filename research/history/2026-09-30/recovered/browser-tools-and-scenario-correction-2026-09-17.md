# 浏览器工具比较与按真实场景选型的纠正

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及 ProjectX、ProjectX-Core、ProjectL 等项目的限制只属于当时项目上下文。

本次整理提示：应连同最后的用户纠正一起读。前文功能清单不是本机实测；当时只验证了打开页面、登录态和读取，未完整验证输入、点击、滚动。

## BrowserSkill 与 Playwright 的初次比较

### 历史 AI 回答 · 原会话第 37 行

来源：`~/.omp/agent/sessions/-WebstormProjects-api-dash/2026-09-17T02-19-57-360Z_01a0ad29-de30-74c1-8307-bc455d985025.jsonl:37`。

## 结论

**BrowserSkill 和 Playwright 不是同一层的产品。**

- **BrowserSkill**：面向 AI Agent 的“真实浏览器操作桥接层”。核心价值是复用用户当前 Chrome/Edge 的登录状态，并提供标签页借用、人工接管和权限确认。
- **Playwright**：通用浏览器自动化与 E2E 测试框架。核心价值是确定性、隔离、断言、并行执行、跨浏览器和 CI。
- 如果你实际想比较的是 **BrowserSkill 与 Playwright MCP**：两者才更接近，但 BrowserSkill 更偏真实用户浏览器和人机协作，Playwright MCP 更偏让 Agent 使用 Playwright 自动化能力。

因此：

> 操作“我的浏览器”选 BrowserSkill；测试“我的应用”选 Playwright。

## 详细对比

| 维度 | BrowserSkill | Playwright |
|---|---|---|
| 产品定位 | Agent 浏览器技能和本地桥接 | 自动化库及 E2E 测试框架 |
| 主要入口 | Agent 调用 `bsk` CLI | JS/TS、Python、Java、.NET API；Playwright Test |
| 浏览器状态 | 默认复用用户真实浏览器配置和登录态 | 默认创建干净、隔离的 BrowserContext |
| 已打开标签页 | 可列出并显式“借用”，结束后归还 | 可以通过 CDP 连接现有 Chromium，但不是主要工作模式 |
| 人工协作 | 原生支持登录、验证码、OTP、确认步骤的人工接管 | 没有对应的任务级人工接管协议，需要自己开发 |
| Agent 适配 | Skill 已定义观察、引用、重试、求助和清理流程 | 原始 API 面向程序；Playwright MCP 才是 Agent 适配层 |
| 元素操作 | `observe` 返回 `@eN` 引用，随后 `click/fill/select` | Locator，如 `getByRole()`、`getByLabel()` |
| 稳定性机制 | 操作前重新观察，页面变化后刷新引用 | Locator 自动重新解析，并具有完善的 actionability 自动等待 |
| 断言能力 | 更偏观察结果后由 Agent 判断 | `expect(locator)` 自动重试断言，适合确定性验证 |
| 测试隔离 | Agent Window 与日常窗口分离，但仍使用真实浏览器状态 | 每个测试默认使用独立 Context，cookie、storage、session 相互隔离 |
| 测试运行器 | 没有与 Playwright Test 同级的 runner | Fixtures、projects、并行、重试、分片、报告 |
| 调试产物 | 截图、长截图、console、network、操作审计 | Trace Viewer、视频、截图、HTML 报告、DOM 快照、网络记录 |
| 网络控制 | 主要是有界、只读诊断 | 可拦截、修改、mock、abort 请求和响应 |
| 浏览器覆盖 | Chrome、Edge；其他 Chromium 可能可用；Firefox 计划中 | Chromium、Firefox、WebKit |
| CI/无人值守 | 可以使用，但依赖 daemon、扩展及浏览器设置 | 一等公民，适合容器和 CI |
| 可编程深度 | 固定 CLI 原语，`evaluate` 是兜底手段 | 完整浏览器 API，适合复杂流程和基础设施 |
| 安全模型 | 标签页借用确认、独立 Agent Window、人工求助开关 | 由调用代码和运行环境负责，没有标签页借用授权模型 |
| 安装复杂度 | CLI + daemon + 浏览器扩展 + Agent skill | npm 等语言包 + 浏览器二进制 |

## BrowserSkill 的实际优势

### 1. 直接复用真实登录态

这是它相对普通 Playwright 最明确的优势。

例如让 Agent：

- 查看已经登录的内部管理后台
- 操作需要企业 SSO 的网页
- 在 GitHub、飞书、Notion 等现有会话中执行一次性任务
- 使用用户已经打开的特定标签页
- 遇到验证码时请求用户短暂接管

Playwright也能保存和加载 `storageState`，或通过 CDP 连接现有 Chromium，但需要自行处理状态文件、调试端口、标签页选择、生命周期和权限问题。BrowserSkill 把这些整理成了现成的产品工作流。

### 2. 权限边界更适合个人 Agent

BrowserSkill 区分：

- Agent 自己创建的页面
- 用户日常使用的标签页
- 显式借用的标签页

用户标签页可以要求确认，任务结束后必须归还。它还提供独立 Agent Window，避免 Agent 默认接管整个浏览器。

这比直接把 Chrome CDP 端口暴露给一个 Agent 更容易控制，但仍应注意：**一旦允许某个 Agent 操作已登录页面，它就可能以你的身份执行网站操作。**

### 3. Human-in-the-loop 是内建协议

BrowserSkill 的 `request-help` 明确定义了：

- 登录
- CAPTCHA
- OTP
- 支付或关键确认
- Agent 多次尝试仍无进展

Playwright当然可以打开 headed browser 让用户手工点击，但“暂停任务、请求用户、等待结果、恢复观察”的流程需要调用方自己实现。

## Playwright 的明显优势

### 1. 更适合真正的自动化测试

Playwright 有完整的测试工程能力：

- 每个测试独立的 BrowserContext
- 自动等待和可操作性检查
- 自动重试断言
- fixtures 和 setup projects
- 多浏览器 projects
- 并行、分片、重试
- HTML report 和 Trace Viewer
- 网络 mock 和 HAR
- CI 集成

BrowserSkill 可以让 Agent“检查一个页面是否正常”，但这不等于建立一套可重复、可审计、可并行运行的回归测试。

### 2. 确定性更强

BrowserSkill 的结果会受到真实浏览器环境影响：

- 当前登录用户
- 浏览器扩展
- 历史状态和缓存
- 网站 A/B 实验
- 用户之前打开的页面
- Agent 的推理和观察结果

Playwright 默认从干净环境启动，更容易复现失败。对于发布门禁和持续回归，这是决定性优势。

### 3. 自动化能力更完整

Playwright 可以精确控制：

- 请求和响应 mock
- 多用户、多 Context 场景
- 权限、时区、locale、设备、网络
- popup、iframe、下载、上传
- JS 执行和 CDP session
- 视频、trace、截图
- API 请求与 UI 流程组合

BrowserSkill 暴露的是经过约束、适合 Agent 使用的一组原语，而不是完整替代 Playwright API。

## 与 Playwright MCP 的关系

如果目标是“让 AI Agent 操作网页”，更合理的三方对比是：

| 场景 | 推荐 |
|---|---|
| Agent 操作用户已登录的真实 Chrome | BrowserSkill |
| Agent 在隔离浏览器中浏览、抓取、检查页面 | Playwright MCP |
| 编写长期维护的 E2E 测试 | Playwright Test |
| CI 中执行稳定回归 | Playwright Test |
| CAPTCHA、SSO、扫码等需要用户接管 | BrowserSkill |
| 需要 Firefox/WebKit 验证 | Playwright |
| 需要网络 mock、多 Context、多用户并发 | Playwright |
| Agent 执行一次性的个人网页工作流 | BrowserSkill |

BrowserSkill 底层也使用 Chrome DevTools Protocol，但在 CDP 上增加了 daemon、扩展、会话、Agent Window、标签页借用和人工协助。它的竞争点不是“比 Playwright API 更强”，而是“更方便且更受控地接入真实用户浏览器”。

## 我的选择建议

- **开发 Web 项目并做回归测试**：继续用 Playwright，不要用 BrowserSkill 替代测试套件。
- **希望 Codex/Claude/Cursor 帮你操作已经登录的网站**：BrowserSkill 更合适。
- **希望 Agent 检查 localhost 或公开部署页面，不需要真实个人登录态**：Playwright MCP 更简单。
- **混合使用**：BrowserSkill 用于探索真实业务流程和处理 SSO；流程稳定后，将关键路径写成 Playwright 测试。这通常是最合理的组合。

来源：

- [BrowserSkill 中文 README](https://github.com/Tencent/BrowserSkill/blob/main/README.zh-CN.md)
- [BrowserSkill Agent Skill](https://github.com/Tencent/BrowserSkill/blob/main/skill/SKILL.md)
- [BrowserSkill 隐私政策](https://github.com/Tencent/BrowserSkill/blob/main/apps/extension/PRIVACY.zh-CN.md)
- [Playwright 简介](https://playwright.dev/docs/intro)
- [Playwright 测试隔离](https://playwright.dev/docs/browser-contexts)
- [Playwright 自动等待](https://playwright.dev/docs/actionability)
- [Playwright 认证状态](https://playwright.dev/docs/auth)
- [Playwright CDP 连接](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)

## 日常页面检查与用户纠正

### 历史 AI 回答 · 原会话第 148 行

来源：`~/.omp/agent/sessions/-WebstormProjects-api-dash/2026-09-17T02-19-57-360Z_01a0ad29-de30-74c1-8307-bc455d985025.jsonl:148`。

结论：

> **对于“开发时让 AI 像用户一样操作页面并检查结果”，BrowserSkill 可以替代你现在使用的 Playwright CLI/skill。**
>
> **但不能完全替代 Playwright Test 作为自动化回归测试框架。**

**BrowserSkill 能覆盖的开发测试**

它可以直接在可见浏览器里完成：

- 打开 `localhost`、测试环境或线上页面
- 复用当前 Chrome 登录状态
- 点击、双击、悬停
- 输入、清空和提交表单
- 选择下拉项、勾选复选框
- 键盘操作
- 页面滚动、滚动到指定元素
- 切换和管理标签页
- 上传和下载文件
- 处理浏览器对话框
- 获取页面文本、HTML和可访问性结构
- 截取页面、元素和完整长截图
- 检查 console 和 network
- 切换移动设备模拟
- 遇到登录、验证码、扫码时让你接管
- 操作后重新观察，判断页面是否达到预期

因此你可以直接给 AI 这种任务：

```text
使用 BrowserSkill 打开 localhost:3000。

用现有登录状态测试新增订单流程：
1. 创建订单。
2. 检查必填项校验。
3. 提交后确认成功提示。
4. 确认列表出现新订单。
5. 打开详情检查字段。
6. 检查 console 是否有错误。
7. 分别截取桌面和移动端结果。
```

它能够真实地输入、点击、滚动和读取操作结果。刚才打开 `linux.do` 已经证明了浏览器连接、登录态复用、页面读取和可见窗口这条链路正常。

**不能完全替代的部分**

BrowserSkill 不等同于 Playwright Test，以下场景仍应保留 Playwright：

| 场景 | BrowserSkill | Playwright Test |
|---|---:|---:|
| AI 临时验收新页面 | 强 | 可以，但不够直接 |
| 使用真实登录账号 | 强 | 需要准备认证状态 |
| 探索性操作 | 强 | 一般 |
| 人工处理 MFA/验证码 | 强 | 需要自行实现 |
| 每次提交自动执行 | 不适合 | 强 |
| CI 发布门禁 | 不适合 | 强 |
| 精确、可重复断言 | 依赖 AI 判断 | 强 |
| 多浏览器兼容测试 | 目前主要是 Chromium | Chromium/Firefox/WebKit |
| 网络请求 mock | 不提供同级能力 | 强 |
| 并行执行大量测试 | 不适合 | 强 |
| 失败 trace 和历史报告 | 有截图和审计，但较弱 | 强 |
| 稳定复现偶发问题 | 受真实浏览器状态影响 | 强 |

最关键的区别是：

- BrowserSkill 证明的是：**AI 这一次实际操作成功了。**
- Playwright Test 证明的是：**固定测试在标准环境下可以反复通过。**

BrowserSkill 的测试结果会受当前账号、已有数据、缓存、弹窗和页面实时状态影响。它适合开发验证，但不能作为严格的发布门禁。

**适合你的落地方式**

可以把默认规则改为：

```text
所有开发阶段的页面操作、登录后流程测试、视觉检查和临时验收，
默认使用 BrowserSkill，不使用 playwright-cli。

只有以下情况使用 Playwright Test：
1. 用户明确要求编写永久 E2E 测试；
2. 仓库已有相关 Playwright 测试需要运行或修复；
3. 流程需要进入 CI；
4. 需要网络 mock、跨浏览器或确定性回归。
```

所以，如果你说的“Playwright”是目前这个 **让 AI 操作浏览器的 `playwright-cli` skill**，那么基本可以替换掉。

如果你说的是仓库中的 **Playwright E2E 测试体系**，不能完全替换。建议保留已有测试，但以后日常开发验收默认使用 BrowserSkill。当前 `linux.do` 的 BrowserSkill session 仍保持打开。

### 用户 · 原会话第 149 行

来源：`~/.omp/agent/sessions/-WebstormProjects-api-dash/2026-09-17T02-19-57-360Z_01a0ad29-de30-74c1-8307-bc455d985025.jsonl:149`。

结合我平时的真实的场景来，好多我是否用到了

### 历史 AI 回答 · 原会话第 150 行

来源：`~/.omp/agent/sessions/-WebstormProjects-api-dash/2026-09-17T02-19-57-360Z_01a0ad29-de30-74c1-8307-bc455d985025.jsonl:150`。

对，我上一条列了太多功能，没有按你的实际使用方式判断。

从你描述的日常场景看，你主要是：**开发一个页面 → 让 AI 打开已登录的页面 → 输入、点击、滚动 → 看结果是否符合预期 → 必要时截图或查控制台。** 你并没有说自己需要 CI 门禁、跨浏览器矩阵、大量并行用例或网络 mock。拿这些能力来强调 Playwright 的不可替代性，对你的选择帮助不大。

**按你目前的需求，BrowserSkill 很可能可以替代你日常交给 AI 使用的 Playwright。** 尤其是你遇到的痛点是 *AI 不知道怎么用 playwright-cli*，而不是缺少 Playwright Test 的某项测试能力。

但要把“能替代”与“已经验证能替代”分开：**我们刚才只实际验证了打开可见窗口、访问 `linux.do`、读取页面；还没有实际验证输入、点击、滚动及操作后的结果判断。** 我之前说它“能够完成你的页面测试”是基于工具说明，不能把它说成这台机器上的实测结论。

因此我的务实建议是：先别为那些你没用到的 Playwright 能力保留日常工具选择。拿你下一个正在开发的页面，用 BrowserSkill 完整走一次真实流程——登录态、输入、点击、滚动、检查结果。**这条流程走通，就把 BrowserSkill 设为日常 AI 页面验证的默认工具；只有将来确实需要固定脚本反复运行时，再用 Playwright Test。**
