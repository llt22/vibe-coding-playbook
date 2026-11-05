# Show HN: Stroq – a local audit of what your coding agent did and why

- 结论：**值得一试**。建议小范围试：先用只读命令审计最近 30 天会话，再在单一仓库接入钩子并核对每次拦截原因；理由是命令和流程可直接执行，但钩子覆盖与文本匹配有明确局限，需先验证误报和覆盖率。
- 原文：https://github.com/AGGIB/Stroq
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T22:19:49.900Z

## 是什么
Stroq 是一个本地运行的 AI 编码智能体审计与防护工具。它读取本机 Claude Code、Codex CLI、Cursor 等会话记录，显示哪些命令来自智能体读过的文本、哪些密钥离开过机器，并可通过 hooks 在工具调用执行前做允许/询问/拒绝判断。材料来自仓库 README，示例卡片和 `sent` 输出标注为虚构机器，不是实测用户数据。

## 具体做法
1. 前提：安装 Node.js 22 或更新版本。Stroq 在本地运行，README 称不联网、无账号、无遥测，只在 `~/.stroq` 下写小缓存；先确认接受它读取本机最近 30 天会话、密钥文件和智能体工作目录。
2. 先做不装钩子的只读基线。运行概览卡片：
```bash
npx @stroq/cli
```
它会读最近 30 天会话，显示命令数、来自智能体所读文本的命令数、离开机器的密钥数、打开即运行代码的仓库数，以及值得查看的时刻。更多命令可用 `npx @stroq/cli help --all`。
3. 查看每个时刻的证据。卡片中的每个时刻有 `show` 行，按编号执行：
```bash
npx @stroq/cli show 1
```
把 `1` 换成要查看的编号。该命令打印该时刻背后的证据。
4. 检查密钥是否被智能体会话带出。运行：
```bash
npx @stroq/cli sent
```
它会将 Claude Code、Codex CLI、Cursor 会话与本机凭据比对，按“发给另一家公司、可能已发、被 AI 看到、与自有服务一起使用、运行前被阻止”等类别列出密钥名和来源，只打印名称，不打印值。
5. 回放历史会话。无需先安装 hooks：
```bash
npx @stroq/cli replay --all
```
它读取智能体自己的 transcript，检查最近 30 天所有会话，指出智能体读过哪些内容、后续哪些动作来自这些内容。前提：本地存在对应会话记录；README 明确说 verdict 是“今天的策略”判断，不是当时实际发生的记录。
6. 启动本地控制台：
```bash
npx @stroq/cli console --workspace /path/to/repo
```
打开命令打印出的完整链接；该链接带有每次启动新生成的 key。控制台只监听 `127.0.0.1`，无账号、无遥测；修改智能体设置或策略前会先给预览，需要你确认。添加 hooks 在 macOS 或 Linux 上可从控制台做；Windows 用 `stroq init`。
7. 接入实时防护。先在一个仓库、一个智能体上小范围接入：
```bash
npx @stroq/cli init
```
README 称 hooks 会在每次工具调用前判断：拒绝 `curl | sh` 和携带已知密钥的外发调用；当命令重复智能体读过的文本时先询问，并指出那段文本。前提：所用智能体支持对应 hooks；README 说明 hook 只能看到宿主传给它的内容，且不同智能体和版本不同。
8. 查为什么某动作被拦：
```bash
npx @stroq/cli why
```
9. 用内置攻击样本测试当前策略：
```bash
npx @stroq/cli attack
```
README 称它会在一处一次性 home 中跑 36 个来自公开报告和合成案例的攻击；0.30.0 上结果为 15 个拒绝、21 个询问、0 个通过。注意这是对策略的测试，不是对你真实环境的完整证明。
10. 不再使用时卸载：
```bash
npx @stroq/cli uninstall
```
11. 可选：从源码构建并启动平台。前提：已有源码 checkout 和 pnpm：
```bash
pnpm install --frozen-lockfile
pnpm --dir console install --ignore-workspace --frozen-lockfile
pnpm platform:build
pnpm platform --workspace /path/to/repo
```

## 对应的研究问题
- 能力发现：它不增加模型能力，但把“编码智能体做过什么、命令是否来自读过的不可信文本、密钥是否外发”变成可检查项，适合用来发现以前没有系统检查过的 agent 行为。
- 任务匹配：面向 Claude Code、Cursor、Codex CLI 等编码智能体；历史审计用 `replay`/`sent`，实时拦截用 `init` 或控制台 hooks，策略测试用 `attack`。README 未比较不同模型优劣。
- 条件供给：需要本机会话记录、凭据文件、工作目录路径，Node.js 22+；实时防护需要把 hooks 写入智能体设置，并允许 Stroq 读取这些记录。控制台通过本地链接提供反馈；hook 决策和证据链是反馈形式。
- 主动推进：hook 在每次工具调用前触发，属于事件触发的前置判断；`replay --all` 和 `sent` 可对最近 30 天会话批量扫描。材料未说明可按时间或状态持续调度，也未给定时任务配置。
- 效果验证：可直接看 `stroq` 卡片计数、`sent` 分类、`replay --all` 标出的可疑会话、控制台 Live 的 allowed/asked/denied/flagged，以及 `attack` 的通过数。README 给出 0/36 通过和 15 deny/21 ask 的示例数字，但示例环境是虚构或一次性沙箱。

## 与已有做法的关系
清单中已有 Claude Code（adopt）、Cursor（watch）、OpenClaw（watch），没有同类本地审计工具条目。Stroq 不替代这些智能体，而是在它们外层做审计和拦截：README 明示支持 Claude Code、Cursor、Codex、Copilot CLI、Windsurf、Antigravity，以及 OpenClaw 插件和 stdio MCP proxy。对 Claude Code 可用 `init` 接 hooks 并用 `replay` 回放；对 Cursor 是支持对象之一，但清单把 Cursor 标为 watch，Stroq 的 Cursor 集成也应随小范围试用一起验证。

## 证据与局限
- 证据：README 给出可执行命令和流程；截图、示例卡和 `sent` 输出都标注为 made-up machine；`attack` 给出 36 攻击、15 deny、21 ask、0 pass；HN 50 points、11 comments 只表示关注度，不是效果证据。
- 作者主张：本地、无 telemetry、无账号、hook 能拒绝 `curl | sh` 和带已知密钥外发、能追踪文本来源、控制台修改前预览。材料未给独立复现或第三方评测。
- 明确局限：hook 只看到宿主发送的内容，不同智能体或版本不同；匹配是文本级，模型从零写出的命令无法回溯来源；它是过滤器不是沙箱；旧、轮换或未知值可能漏掉；密钥可能通过脚本、文件、变量离开而不出现在命令中；本地 transcript 匹配本身不能证明已送达模型提供商；控制台从 macOS 或 Linux 添加 hooks，Windows 用 `init`；`replay` 的 verdict 是当前策略判断，不是历史记录。
- 适用条件：需要本机会话记录和 Node 22+；适合想给编码智能体加本地审计和前置拦截的团队；不适合把它当完整安全沙箱或合规证明。

## 怎么试、怎么验证
最小试用：选一个仓库和一个编码智能体，先不装 hooks，运行 `npx @stroq/cli`、`npx @stroq/cli sent`、`npx @stroq/cli replay --all`，记录卡片计数、密钥外发分类、可疑会话和每个时刻的证据；再运行 `npx @stroq/cli attack` 记录 0 通过、拒绝和询问数。然后只在该仓库执行 `npx @stroq/cli init`，正常使用智能体一段时间，用 `npx @stroq/cli console --workspace /path/to/repo` 看 Live 的 allowed/asked/denied/flagged，并用 `npx @stroq/cli why` 抽查每次拦截理由。验证指标：高风险动作是否被拒绝或询问且有可读证据；已知攻击通过数是否保持为 0；`sent` 中“发给另一家公司”或“可能已发”的条目是否被及时发现并轮换；误报是否可接受（README 链到 False positives 文档，但材料未给具体数据，需人工核对）。不要只看 denied 数量变多，要看拦截是否对应真实风险、是否减少未知外发和无法解释的 agent 动作。
