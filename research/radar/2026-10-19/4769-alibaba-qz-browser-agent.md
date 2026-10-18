# alibaba/qz-browser-agent

- 结论：**值得一试**。先在个人 Chrome/Edge 上装扩展、接一个自带 API key 的模型，跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源后再把跑通的流程存成 Skill 复用；理由是 README 给出了完整的安装、配模型、CLI/MCP 接入与源码构建步骤，可照做，但可靠性只有作者自述、没有独立评测，仓库采用度也低，还不宜直接 adopt。
- 原文：https://github.com/alibaba/qz-browser-agent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T23:09:35.627Z

## 是什么

qz 是阿里巴巴开源（Apache-2.0）的「本地优先」浏览器智能体，作为 Chrome 扩展运行在你日常使用的 Chrome / Edge 里。核心形态是：在侧边栏用一句话描述任务，它在你已经登录的站点上跨站执行（点击、翻页、滚动加载），抽取数据，最后产出表格、文件或带来源的报告。

几个关键设计点：

- **自带模型（BYO model）**：在设置里选 provider、填自己的 API key；也支持 ChatGPT 账号登录（OpenAI Codex，免 API key）以及兼容协议的本地模型服务。数据只发给你选的模型和你访问的网站，会话、Skill、采集数据都存在本地，没有 qz 服务端。
- **人机同视**：任务在侧边栏运行，每一步和结果可见，可随时介入或停止。
- **可被其他 agent 调用**：Claude Code、Codex、pi、Grok Bot 这类编码 agent 可以通过 CLI 或 MCP 把网页任务转交 qz，qz 跑完把结果回传。
- **并行与 Skill 化**：可同时跑多个任务，每个任务可再拆子任务；任务跑通后说一句「Save this as a Skill」，下次一句话复用。

## 具体做法

### 步骤 1：安装扩展
**前提**：使用 Chrome 或 Edge（README 明确 Firefox 不支持）。

- 常规路径：在 Chrome Web Store 点击 **Add to Chrome**，然后点工具栏 qz 图标打开侧边栏。
- 商店不可达时手动安装（README 给出的完整流程）：
  1. 从 latest release 下载 ZIP 并解压；
  2. 打开 `chrome://extensions`，开启 **Developer mode**；
  3. 点 **Load unpacked**，选择解压出的 `qz-browser-agent-extension` 文件夹；
  4. 打开侧边栏，按步骤 2 配置模型。

### 步骤 2：接入模型
**前提**：有一个支持 tool calling 的 provider 或兼容的本地模型服务；或一个 ChatGPT 账号。

1. 打开 **Settings**；
2. 选择 provider（README 列出的预设包括 OpenAI Codex、OpenRouter、DeepSeek、Kimi For Coding、OpenCode Go、OpenCode Zen、Fireworks AI 等）；
3. 粘贴 API key 并保存；
4. 若用 ChatGPT 账号：选择 **OpenAI Codex**，按 `auth.openai.com` 的设备码流程登录，回到 qz 选模型并保存，无需 API key。

### 步骤 3：跑第一个任务
**前提**：已登录目标站点（这是 qz 相对独立浏览器的核心优势，cookie/登录态直接可用）。

在侧边栏输入一句话任务，README 的最小示例：

```text
Find this year's Nobel Prize winners in every category and put them in a table with source links.
```

多源对比型任务示例（README 原文）：

```text
Compare the major open-weight LLMs released in the last 6 months, one per row: release date, parameters, context length, license, and key benchmarks, with official sources.
```

### 步骤 4：把跑通的流程固化为 Skill
**前提**：任务已成功跑完一次，输出结构符合预期。

1. 先跑通一次，例如：

```text
Find 10 arXiv papers on browser agents from the past month, with titles, one-line takeaways, and links.
```

2. 对 qz 说「Save this as a Skill」；
3. 下次用一句话触发复用（README 示例：说「This week's browser agent papers」）。

### 步骤 5（可选）：让外部 agent 把网页任务交给 qz
**前提**：Node.js 22 或更高版本；本机默认浏览器已装 qz。

1. 安装 Skill，让外部 agent 知道如何调用 qz：

```bash
npx skills add alibaba/qz-browser-agent -g
```

2. 配对一次（自动与默认浏览器配对）：

```bash
npx qz-browser-agent@latest connect
```

3. 直接对 agent 下指令，例如：

```text
Use qz to compare open-weight LLMs released in the last 6 months and put them in a table with sources.
```

直接用 CLI 或 MCP：

```bash
npx qz-browser-agent@latest create "your task" --stream
```

- `--stream` 会显示进度、qz 需要你回答的问题，以及最终结果。
- MCP 客户端：配对后运行 `npx qz-browser-agent@latest mcp`，使用它返回的 HTTP URL。
- 常用可全局安装：`npm install --global qz-browser-agent`，之后用 `qz` 代替 `npx qz-browser-agent@latest`。
- 多浏览器配对、追问、导出见 `docs/cli.md`。

### 步骤 6（可选）：从源码构建与调试
**前提**：Node.js 24 LTS 与 npm；本地有仓库 checkout。

```bash
npm ci
npm run build
```

然后在 `chrome://extensions` 开启 Developer mode，Load unpacked 选择 `dist/extension/`。

开发与验证：

```bash
npm run dev       # Rebuild on source changes
npm test          # Run the default test suites
npm run verify    # Type-check and run all automated suites with coverage
```

每次重新构建后需在 `chrome://extensions` 重新加载扩展并重开侧边栏。要新增工具、视图、设置或 provider，参考 `src/capabilities/README.md`。

## 对应的研究问题

**1. 能力发现（AI 还能接手哪些工作）**
- 跨站、跨来源的信息汇总与对比表生成（README 给了「近 6 个月开源权重 LLM 对比表」这一具体任务形态，字段级指定：发布日期、参数量、上下文长度、许可证、关键基准）。
- 需要登录态的网页数据抽取（利用你已登录的浏览器，而非另起无状态环境）。
- 把一次性调研变成可复用的「Skill」：同一类工作第二次只需一句话。
- 外部 agent 的「浏览能力外包」：编码类 agent 把网页操作交给 qz，拿回干净结果继续处理。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- 适合：被登录墙、长点击序列、滚动加载卡住的真实站点流程——README 明确把这三点列为通用 agent 的失败点，qz 的定位就是补这块。
- 模型可替换：DeepSeek、Claude、OpenAI、OpenRouter 等预设，或兼容协议的本地模型；前提是模型支持 tool calling。
- 协作方式有两种明确形态：人机同侧边栏（人看每一步、可介入），以及 agent-to-agent（Claude Code / Codex 经 CLI 或 MCP 委派）。

**3. 条件供给（需要给什么信息、工具、权限、反馈）**
- 工具：Chrome 或 Edge 扩展；外部 agent 桥接需 Node.js 22+（源码构建需 Node.js 24 LTS）。
- 权限/凭据：模型 provider 的 API key，或 ChatGPT 账号；浏览器本身的登录态与 cookie（这是它能干活的前提，也是权限边界所在，README 指向 `docs/permissions.md`）。
- 信息：任务用一句话描述，字段、格式、来源要求在提示词里写清（README 示例都显式要求「with sources」「flag anything unverified」）。
- 反馈：侧边栏实时可见每一步，可随时介入或停止；`--stream` 模式下会显示进度和需要你回答的问题。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- 有依据的部分：多任务并行、每个任务可再拆子任务；任务会自动切到 Goal 模式（README 图注：Gathers from multiple sources and switches on Goal mode automatically）；Skill 复用使重复性周报类任务从「重新描述」降为「一句话触发」。
- 无依据的部分：README 没有给出定时调度、事件监听或状态触发的机制。「This week's browser agent papers」这类周期性任务仍需人或外部 agent 再次发起。这是该线索在「主动推进」维度上的明显缺口，不要按 README 推断它具备定时能力。

**5. 效果验证（怎么判断真的改善了结果）**
- README 提供的唯一可操作约定是：输出要带来源链接，并标注未核实项（`flag anything unverified`）——这给了人工抽检的入口。
- 除此之外没有准确率、耗时、成功率等任何指标或评测。对比表是作者按各家公开文档自评的（✅/◐/❌），不构成效果证据。

## 与已有做法的关系

- **Claude Code（adopt）、OpenAI Codex（adopt）**：qz 不替代它们，而是作为它们的「浏览器执行后端」。README 明确给出 `npx skills add alibaba/qz-browser-agent -g` + `npx qz-browser-agent@latest connect` 的接入路径，以及 `create ... --stream`、`mcp` 两种直接调用方式。对已有这两个工具的读者，这是增量能力（真实登录态 + 可见可介入的浏览执行），不是重复建设。
- **Playwright MCP（try）**：同类但定位不同。Playwright MCP 走确定性脚本/工具调用，需要自己写选择器与流程；qz 走「一句话委派整个任务」，把点击序列交给模型，并额外提供登录态复用、并行子任务、Skill 固化。两者可并存：稳定高频流程用 Playwright，长尾多变的跨站调研用 qz。
- **DeepSeek（try）**：qz 支持列表里的 provider 之一，可直接填 DeepSeek 的 API key 驱动。
- **OpenCode（watch）**：README 的 provider 预设中出现 OpenCode Go / OpenCode Zen，属于可接入的模型来源，非竞品关系。
- **arXiv（try）**：README 的 Skill 示例正是「抓取近一月 browser agents 相关 arXiv 论文并给出一句话要点与链接」，可直接复用为 arXiv 调研的采集端。

## 证据与局限

**原文给出的可核对内容**：
- 完整可执行的安装路径（商店安装 + 手动 Load unpacked 两套）、模型接入路径（API key / Codex 设备码登录）、CLI 与 MCP 的接入命令、源码构建与测试命令（`npm ci` / `npm run build` / `npm test` / `npm run verify`）。这些是可照做的工程事实，不是观点。
- 仓库有 Chrome Web Store 与 npm 发布、CI 徽章、Apache-2.0 许可证，说明至少是可获取、可构建的实体。
- 与 Nanobrowser、Browser Use、agent-browser、Playwright MCP 的对比表，逐项给出 ✅/◐/❌。

**只是作者主张、未经独立验证**：
- 「通用 agent 在真实浏览中会被登录墙、长点击序列、滚动加载打断，qz 能可靠执行这些流程」——README 未给任何成功率或案例数据。
- 「并行研究 / 子任务拆分能避免单 agent 卡死」——无论证数据。
- 对比表完全由作者基于各家公开文档自评（且标注时间点为 2026 年 10 月），不是第三方基准；README 虽链到 `docs/benchmarks.md`，但材料中不含其内容。
- 「Save this as a Skill」的复用稳定性（跨站点改版、跨时间是否仍成立）未提及。

**信号层面的风险**：仓库仅 46 stars，采用度低、社区反馈样本少；作为浏览器扩展它拥有读取你所有已登录站点的能力，权限面很大，材料中只有指向 `docs/permissions.md` 的链接而无具体内容，实际使用时需自行核查权限声明。

**适用条件**：Chrome 或 Edge；愿意自付模型调用费用（扩展与 CLI 本身免费）；模型需支持 tool calling；外部 agent 桥接需 Node.js 22+；Firefox 不支持。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 装扩展，只配一个成本可控的 provider（例如已有清单里的 DeepSeek），用最低额度跑通「诺贝尔奖表格」这类小任务，确认能出带来源的表格。
2. 选 3 个真实任务，覆盖三类能力：
   - 多源对比：一个需要 5 个以上不同站点、字段固定的对比表（如供应商/模型/价格对比）；
   - 登录态抽取：一个必须登录才能看的页面（自家后台报表、付费数据库），验证 cookie 复用是否真的省掉登录环节；
   - 周期调研：把上面 arXiv 示例改成本领域关键词，跑一次并存为 Skill，隔一周用一句话复跑。
3. 每个任务同时用你现有方式（人工或 Claude Code + Playwright MCP）做一遍作为基线。
4. 跑通的那个任务执行「Save this as a Skill」，一周后用一句话复用，观察是否需要重新纠正。

**判断有没有改善的指标（每次记录，做前后对比）**

- **人工介入次数**：从下任务到拿到可用结果，你中途接管/修正了几次。这是 qz 最该改善的指标；若与人工相当，则价值不成立。
- **字段准确率**：从输出表格里抽 20 行，逐行点开来源链接核对，记录错误字段数与「来源链接可打开且确实支持该数值」的比例。
- **未核实项标注率**：提示词里要求 `flag anything unverified` 后，输出中确实被标注的比例——用来判断它是否在编造。
- **端到端耗时**：与人工基线、与 Playwright MCP 脚本方案分别比。
- **Skill 复用的第二次耗时与首次耗时之比**，以及第二次是否仍需人工修正。
- **并行有效性**：同时下 3 个任务，观察是否真的并行推进、是否互相干扰登录态。

**止损条件**：连续 3 个任务中，字段准确率低于人工基线、或人工介入次数不降、或出现来源链接与数值不匹配却未标注的情况，则退回人工 + Playwright MCP 的确定性方案，把 qz 降到 watch。
