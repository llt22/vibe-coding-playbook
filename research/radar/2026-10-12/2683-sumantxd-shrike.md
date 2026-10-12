# SumantxD/shrike

- 结论：**值得一试**。在一台 macOS Apple Silicon 上用一个小型 Node/Next（或 FastAPI/Flask/Django）项目接入 Shrike，完整走一遍“点击出错按钮→Agent 沿真实执行轨迹定位到行→批准 diff→重放同一次点击验证”的闭环，理由是把真实运行轨迹（含行内真实值）通过 MCP 喂给 Claude Code、并强制人工批准后才能改码，正好补上编程智能体“看不见实际执行、只能读代码猜”的短板；但只有 macOS 构建、项目仅 31 stars 且无独立评测，先小范围试。
- 原文：https://github.com/SumantxD/shrike
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T08:11:59.275Z

## 是什么

Shrike 是一个面向“用 AI 搭 Web 应用的人”的开源调试器（MIT，Electron 桌面应用）。核心机制：你在页面上点击出问题的按钮，它把这次点击从浏览器→服务器→数据库的整条路径记录成一条 trip，失败的那一步标红并显示当时真实的值（例如 `userId: undefined` 出现在 `todos.controller.ts` 第 18 行）；记录通过内置 MCP server 暴露给编码智能体，智能体据此把原因钉到具体代码行并给出 diff，必须由你点 Apply 才真正改代码，改完自动重放同一次点击来证明修好了。

定位是本地开发调试，不做生产监控（README 明确写 “For errors in production, keep Sentry”）。支持 Node 后端（Express、Next.js、NestJS、Hono、Remix）、Python 3.12+ 后端（FastAPI、Flask、Django）和 Vite/Next 前端；其他会说 OpenTelemetry 的后端（.NET、Go、Java、3.12 之前的 Python）只有基础 tracing。

## 具体做法

**前提**：macOS Apple Silicon（语音需 macOS 15+）；你的应用能在 Node 22.18 及以上运行；从源码跑需要 Node 24 + pnpm 10；Claude Code 是可选项（装了就用你自己的订阅，没装则用内置 agent + 你自己的 Anthropic API key；完全不接 agent 时，记录、Thread、API client 仍可用）。

**步骤 1：安装二进制版**
1. 从 Releases 下载 `Shrike-<version>-arm64.dmg`，拖进 Applications。
2. 打开 Shrike（该构建已由 Apple 签名并公证，可像普通应用一样打开）。
3. 点 **Open the sample project** → 按 **Run** → 加一个 todo，看它如何崩。

**步骤 2：或从源码运行**
```sh
git clone https://github.com/SumantxD/shrike.git
cd shrike
pnpm i
pnpm dev
```
Linux（x64/arm64）暂无发布版：用 `scripts/release/build-linux.sh` 构建 AppImage 或 `.deb`（见 `docs/RELEASING.md`），或取某次 CI 的 `shrike-linux-x64` artifact；NixOS 上用 `appimage-run`。Windows 能用同一份配置构建，但从未在 Windows 机器上跑过。语音仅 macOS。

**步骤 3：接进终端里的 Claude Code**
```
/plugin marketplace add SumantxD/shrike
/plugin install shrike@shrike
```
装好后，终端里的 Claude Code 能读 Shrike 的同一份记录（Shrike 需保持打开），会在提示词上方带出最新 trip，并可用 `/shrike`。用 Cursor 或其他 MCP 客户端时，从 Shrike 的 Tools 面板复制一行式 setup。

**步骤 4：走一遍完整闭环**
1. 让 Shrike 运行你的应用（它会把应用的 OpenTelemetry SDK 指向自己）。
2. 点击出问题的按钮：Thread 视图画出 trip（你、页面、服务器、数据库各泳道），坏掉的那步变红，并内联显示真实值。
3. 按 **E** 打开 Files 视图：打开的就是实际执行到的行、带当时经过的值，旁边是这次点击碰过的所有文件（热行=跑过，红行=坏了），底部是可拖动的调用路径。
4. 用大白话提问，原文示例：`when I click Add Todo nothing shows up`。agent 会走一遍已记录的 trip，把原因钉在某一行并一句话说明，你还能看到它用了哪个 playbook。
5. 看它给出的 diff → 点 Apply 批准 → Shrike 重放同一次点击证明通过 → 再提交、开 PR；PR 的检查失败与 review 评论可在同一窗口读，并可把失败转成 lessons。
6. 想并行比方案：用 git worktree 副本（各自端口、各自 agent）同时跑两份修复，留下通过的那份。

**步骤 5：默认已生效的隐私/审批行为（不需要额外配置）**
- 无账号、无遥测，代码、记录和密钥留在本机。
- 密钥在存储、展示、发给 agent、导出之前一律剥离。
- agent 不能直接改文件，每个改动都是你批准的 diff。
- 只有你主动要求时才外连：agent 自己的 API、从 Hugging Face 下载语音模型、通过你的 `gh` 登录访问 GitHub。

**能力边界（决定你能不能照做）**：Python 3.12+ 下无需改代码即可记录进你自己代码的每次调用及其参数、返回值、文件与行号，并嵌套在触发它的请求下，另有 sqlite3 查询记录（`packages/python-agent`）。其他 OpenTelemetry 后端只有请求、查询和外部调用，拿不到逐函数的值。

## 对应的研究问题

**1. 能力发现（AI 还能接手哪些原本没想到的活）**
- 读“真实执行轨迹”而不是读代码猜：让 agent 沿一次点击的记录定位到具体行，并把真实值（如 `userId: undefined`）摆在同一行。
- 把 PR/CI 的失败检查用大白话解释，并转成 lessons（README 提到 Fix it / Explain / Learn from this）。
- 可进化的 skills：像 “Bad value”、“N+1 hunter” 这类 playbook，会在修复被验证后更新，且支持一键 Undo。
- Python 3.12+ 后端零改动拿到函数级参数/返回值，属于平时不会想到交给工具的记录粒度。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- agent 适合做“沿记录定位原因 + 产出 diff”；人负责触发复现和批准；验证由 Shrike 自动重放同一次点击完成。
- 通过 MCP hub 让终端里的 Claude Code 读同一份记录（一行式接入）；也可加自己的 MCP server。
- 想赛方案时用 worktree 多副本并行，一个项目一条 rail。
- 栈匹配：Node/Python 3.12+ 服务器 + Vite/Next 前端可拿到逐函数值与行号；其他 OTel 后端只能做粗略链路。

**3. 条件供给（要喂什么信息、工具、权限、反馈）**
- 信息：由一次真实点击触发、端到端关联（浏览器 + 服务器 + 数据库）的执行记录，含每步耗时、值和源码行。
- 工具：MCP server（Claude Code 插件两行安装；其他客户端复制一行 setup）。
- 权限：写文件的权限必须收回，改为“人点 Apply 才落地”的审批闸门。
- 反馈：改动后用同一次点击的 replay 作为验收信号，而不是让模型自评。

**4. 主动推进（时间/事件/状态触发与持续完成）**
- 原文依据很少：只有“点击即自动记录整条 trip”“worktree 里并行跑修复”“任何离开本机的动作都要先问”，没有给出定时或状态触发的机制描述。这一项在本条线索中基本无依据，不宜据此写进手册。

**5. 效果验证（怎么判断真的变好了）**
- 修复后重放同一次点击来证明通过（README 的“replays the same click to show it passes”）。
- 修复进 PR 后仍可读 CI 检查和 review 评论。
- skill 只在修复被验证后才更新，并保留一键 Undo。
- 注意：原文没有任何准确率、耗时或成功率数字，验证方式是可操作但未被独立度量的。

## 与已有做法的关系

清单条目：Claude Code（adopt）、Cursor（watch）、OpenCode（watch）。
- **Claude Code（adopt）**：Shrike 直接提供 Claude Code 插件和 MCP server，安装即上面那两行 `/plugin marketplace add`、`/plugin install`；接入后终端里的 Claude Code 与 Shrike 共享同一份记录，但改码仍只在 Shrike 里点 Apply 才生效。这意味着它是对已 adopt 的 Claude Code 的一条“补上下文 + 加审批闸门”的增强路径。
- **Cursor（watch）**：README 只说 Cursor 或其他 MCP 客户端可从 Shrike 的 Tools 面板复制一行式 setup，没有给出具体命令或步骤，无法照抄。
- **OpenCode（watch）**：只在 Roadmap 的未完成项里出现（“Codex and OpenCode as agent brains”），当前并不支持。
- 与浏览器 devtools / Sentry / Postman-Bruno 的关系：作者把 Shrike 定位成“每次点击页面+服务器+数据库一条 trip、真实值落在跑过的那一行、修完重放验证、本机无账号”的组合，同时明确承认生产监控仍应用 Sentry。

## 证据与局限

**材料来源**：本次只有 GitHub README（仓库 SumantxD/shrike，31 stars），没有实测、没有 issue/讨论内容、没有版本发布记录或第三方评测。以下区分可核验内容与作者主张。

**较可核验的具体内容**：安装与源码运行命令、Claude Code 插件两行命令、支持的技术栈清单与各栈的记录粒度、隐私与审批机制的描述、Roadmap 的勾选状态、包结构（`packages/browser-agent`、`node-agent`、`correlator`、`mcp-server`、`apps/desktop`）。

**仅属作者主张**：
- “How it compares” 对比表中对浏览器 devtools、Sentry、Postman/Bruno、单用 Claude Code 的各项优劣判定。
- Bazaar 示例应用“一次 Place order 跨 8 个服务、3 个 Postgres、1 个 SQLite outbox、3 个 LRU 缓存、队列、Stripe 和邮件服务，仍能停在那一行”。
- “agent 第一次就修对”“40 秒演示视频”等效果宣称，均无准确率、耗时或对照实验数据。

**适用条件与硬限制**：
- 只覆盖本地开发调试，不能替代生产监控。
- 平台强绑定 macOS Apple Silicon；Linux 需自己构建且无语音，Windows 未在 Windows 机器上验证过。
- 从源码跑要求 Node 24、pnpm 10；语音还需 Xcode（helper 首次使用时构建）。
- 不装 Claude Code 就要自备 Anthropic API key。
- 项目成熟度有限：Roadmap 中自动更新、Windows/Linux 正式发布、可分享记录（`.shriketrace`）与只读 web viewer、更多栈（Vite SSR、SvelteKit、Nuxt）均未完成。

## 怎么试、怎么验证

**最小试用方式**
1. 在一台 macOS Apple Silicon 机器上装 Shrike（二进制版最快）。
2. 先用自带 sample project 走通一次完整闭环：点到崩溃 → 看 Thread 红行与内联真实值 → 让 agent 说 “Found it” → 看 diff → Apply → 观察同一次点击的 replay。
3. 换成你自己一个真实项目（Node/Express、Next.js、NestJS、Hono、Remix，或 FastAPI/Flask/Django 3.12+），挑一个真实的“点按钮没反应或报错”的 bug 复现一遍。
4. 装上 Claude Code 插件，用终端里的 agent 定位同一个 bug，对比它与“直接把报错粘进聊天”的表现差异。
5. 若团队有多个并行修复需求，再试 worktree 双副本赛方案。

**判断有没有改善的指标（都可数）**
- 从点击到定位到具体代码行的往返次数：对照 README 的 Without 列（复制三个终端日志 → 猜是哪个请求 → 模型读代码猜 → 试到碰对），看是否收敛到一次点击一条记录。
- agent 第一次给出的修复是否需要推倒重来；把“replay 同一次点击是否通过”作为硬判定，统计通过率。
- 需要人工粘贴日志、翻找文件的次数是否下降。
- 调试、发 API 请求、看 PR/CI 是否能在同一窗口完成，减少窗口切换。
- 注意：这些都是过程指标，README 未提供任何节省时间或成功率的基准数字，所以不要把它当作已验证的收益结论；先用一两个真实 bug 做前后对照，再决定是否扩大使用范围。
