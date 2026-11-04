# browser-act/skills

- 结论：**值得一试**。建议把 BrowserAct Skills 作为现有编码代理的浏览器执行层做小范围试用：先用 get-skills 探测环境，用独立 session 跑只读或低风险任务，并用 remote-assist 兜底；README 给出一手安装与命令，但关键稳定性和反封锁效果多为作者主张，且 stealth 能力需登录或付费，暂不宜直接 adopt。
- 原文：https://github.com/browser-act/skills
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T10:17:23.875Z

## 是什么
BrowserAct 是面向 AI agent 的浏览器自动化 CLI/Skill，目标是把真实浏览器操作、网页数据抽取和账号型工作流交给 agent。README 给出两种用法：云端托管执行，以及本地浏览器控制并接入自己的 agent 工作流。

核心能力包括：绕过反爬的三层设计（环境层 stealth 指纹/TLS/代理、执行层 solve-captcha 与 stealth-extract、人工层 remote-assist）、三种浏览器模式（复用本地 Chrome 登录态、隐私批处理、固定身份多账号）、跨浏览器和同浏览器多会话并发隔离、面向 agent 的索引化文本输出与交互。仓库为 MIT License，README 标注 6318 stars，兼容 Windows/macOS/Linux，并声明适配 Claude Code、Cursor、VS Code、OpenCode、OpenClaw、Codex、Gemini CLI 等可执行 shell 且能加载 Skill 的 agent。

## 具体做法
1. 安装/加载 Skill。前提：你的 agent 能执行 shell 命令并加载 Skills，机器可联网。对 agent 说：
```
Install browser-act. Skill source: https://github.com/browser-act/skills/tree/main/browser-act . Verify it works after installation.
```
README 让 agent 安装后自行验证；更细的安装说明在 docs/installation.md，但本次材料未包含该文档内容。

2. 每个会话开始时先探测环境。前提：Skill 已安装。运行：
```
browser-act get-skills core --skill-version 2.0.2
```
README 称该命令一次返回环境状态、浏览器列表和可用命令，便于 agent 选择后续动作。

3. 选择执行模式。前提：明确任务是本地浏览器控制还是云端托管。
- 云端：无需自己搭 agent，描述目标网站、筛选条件和字段，BrowserAct 在真实云浏览器中构建并测试可复用 scraping Bot，再从云端运行。README 没有给出具体命令，只给了网站入口和演示链接。
- 本地：适合需要本地 Chrome 登录态复用或直接嵌入自有 agent 工作流。登录态可用 chrome 模式的 profile import 或 CDP attach；无登录批处理用 stealth 隐私模式，每次新指纹加代理轮换；登录账号多开用 stealth 固定身份，要求稳定指纹加稳定 IP。

4. 零配置抓取受保护页面。前提：README 的免费表显示 stealth-extract 属于登录后免费功能，因此需要 BrowserAct 账号；只对已获授权的页面使用。运行：
```
browser-act stealth-extract https://example.com
```

5. 单任务浏览器自动化。前提：把 `<id>` 换成 get-skills 返回的浏览器 id，并给任务起唯一 session 名。运行：
```
browser-act --session my-task browser open <id> https://example.com
browser-act --session my-task state
browser-act --session my-task click 3
browser-act --session my-task input 2 "hi"
```
`state` 返回带索引的可交互元素列表，随后用 `click 3`、`input 2 "hi"` 按索引操作，不需要解析 DOM。

6. 并发与隔离。前提：不同任务使用不同 `--session` 名称；需要账号隔离时使用不同 browser/profile，而不是只换 session。README 区分两种并发：跨浏览器并行时 cookie、指纹、代理独立；同浏览器多 session 共享登录态但独立执行、任务互不阻塞。浏览器创建/删除、Profile 导入、代理变更、安全与隐私开关等敏感操作需要用户显式批准，且此前的批准不会延续。

7. 卡住时人工接管。前提：remote-assist 属于登录后免费功能；README 未给出具体命令，需查 docs。流程是生成一个实时 URL，用户从任意设备打开接管，完成后 agent 继续。不要让 agent 在未授权或高风险账号上无人值守运行。

8. 对重复网站做批量化 Skill。前提：同一网站需要反复、规模化抽取。先对 agent 说：
```
Install browser-act-skill-forge. Skill source: https://github.com/browser-act/skills/tree/main/browser-act-skill-forge . Verify it works after installation.
```
然后描述需求，例如：
```
Forge a Skill that extracts job listings from LinkedIn — title, company, salary, URL. I'll run 300 keywords later.
```
README 称 Skill Forge 会探索一次网站、发现 API 和数据模式、生成可部署 Skill，之后不再重复探索；但本次材料没有给出 Skill Forge 的底层命令和失败处理细节。

9. 安全边界。前提：所有敏感操作走确认门禁。README 强调确认门禁在 Skill 层强制执行，不是配置开关；因此不要把浏览器创建/删除、Profile 导入、代理变更等权限预先批量授予 agent。

## 对应的研究问题
1. 能力发现：README 明确列出可交给 agent 的浏览器工作：真实浏览器自动化、受保护页面抽取、CAPTCHA 处理、登录态复用、多账号隔离、跨浏览器/同浏览器并发、人工接管后续跑、重复网站生成可复用 Skill。这些是具体能力清单，不只是泛泛宣传。

2. 任务匹配：README 给出按场景选模式的依据：要复用本地 Chrome 登录态选 chrome；无登录批量抓取选 stealth 隐私模式；登录账号多开选 stealth 固定身份；不想搭 agent 选云端托管；需要嵌入自有 agent 工作流选本地 Skills。并发上，跨账号隔离用不同 browser，共享登录态但独立执行用同浏览器多 session。

3. 条件供给：需要给 agent shell 执行能力、安装 Skill、可访问的浏览器环境；本地登录态场景需要 Chrome profile 或 CDP；stealth 相关能力需要 BrowserAct 登录，部分代理和超过 5 个 stealth browser 需要付费；敏感操作需要用户逐次批准；反馈依赖 `get-skills` 的环境/浏览器列表和 `state` 的索引化页面状态。

4. 主动推进：README 支持可复用 scraping Bot、重复运行、多 session 并行和 Skill Forge 的“探索一次、后续稳定运行”，具备持续执行的基础。但本次材料没有给出时间触发、事件触发或状态触发机制，也没有调度器说明；主动推进只能算部分有依据。

5. 效果验证：README 没有给出成功率、准确率、延迟、成本或对比实验数据。只能由使用方自行设计验证，不能把作者主张当作已验证效果。

## 与已有做法的关系
清单中有 Claude Code（adopt）、Cursor（watch）、OpenClaw（watch）、OpenCode（watch）。README 的兼容列表明确包含 Claude Code、Cursor、OpenCode、OpenClaw，因此 BrowserAct 更像是给这些现有 agent 增加浏览器执行层的补充，而不是替代它们。清单中没有同类的浏览器自动化条目；若团队已在 Claude Code 中工作，可优先把它作为 Claude Code 的可选 Skill 试用。

## 证据与局限
证据主要来自仓库 README：安装提示词、Quick Start 命令、浏览器模式表、并发说明、免费/付费表、兼容列表、MIT License，以及 6318 stars 的仓库指标。README 还链接了演示视频和 Solutions Catalog（声称有 30+ 预建 Skills，覆盖 Amazon、Google Maps、YouTube、Reddit、WeChat、Zhihu 等）。

局限也很明显：本次材料只有 README，没有 docs/installation.md、quick-start.md、skills.md 等详细文档，remote-assist、云端托管、Skill Forge 的具体命令和异常处理无法核对。反封锁效果、token 效率“数是 JSON/HTML 的数倍”、账号不被标记、零干扰并发等，都是作者主张，没有给出测试方法、样本量、失败率或独立复现。CAPTCHA 处理、代理轮换、多账号操作还可能涉及目标网站条款和合规风险；README 没有展开合规边界。核心 stealth 功能需要登录，代理和超过 5 个 stealth browser 需要付费，不适合在不评估成本与授权的情况下直接全量采用。

## 怎么试、怎么验证
最小试用：选 3 类低风险任务各 1 个——公开页面字段抽取；已登录内部系统的只读查询；一个需要人工接管的登录或验证码场景（须获授权）。在 Claude Code 或其他兼容 agent 中安装 Skill，先用 `get-skills` 确认浏览器列表和命令；每个任务用独立 `--session`；并行时用不同 browser/profile，避免同账号并发；记录每次是否完成、字段是否准确、是否触发 CAPTCHA/封锁、是否需要 remote-assist、接管耗时、是否出现串号、总耗时和费用。

判断改善的指标：与现有手工流程或旧工具做基线对比，看任务成功率、字段抽检准确率、人工接管率与接管时长、阻塞率、跨会话污染次数、单任务耗时、token/命令开销、付费 credits 消耗、合规事件数。建议每类任务重复足够次数（例如 10 次）再判断；若成功率与准确率不低于基线、接管和阻塞可控、无串号与合规问题，再扩大范围；否则退回手动或换工具。
