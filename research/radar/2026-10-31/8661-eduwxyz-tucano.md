# eduwxyz/tucano

- 结论：**值得一试**。建议小范围试用：先用 2–3 个编码代理在一个频道里跑真实小任务，并把合并、发布、删除等写操作设为人工审批；理由是 README 给出了可照做的安装、连接器、权限和定时触发步骤，但只有项目自述、缺少独立效果数据，暂不宜直接 adopt。
- 原文：https://github.com/eduwxyz/tucano
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T18:05:48.338Z

## 是什么
Tucano 是本地桌面应用，把 Claude Code、Codex、OpenCode、Pi 等编码代理组织成有名字、角色、工具和记忆的团队。代理在频道中用 @ 提及交接工作，可互审、调用 MCP 工具；写操作在触达真实世界前进入人工审批；还提供记忆、技能、日历/事件例程、独立电脑/浏览器、用量报告。依据 README，它强调“你的规则”和“数据留在本机”。

## 具体做法
1. 前提核对：需要 macOS Apple silicon（M1 或更新）、Linux x64/ARM64、或 Windows 10/11 x64；至少安装并登录一个 harness。Docker 和 Chrome 是可选项。Windows 还需要 Git for Windows，因为代理命令由 Git Bash 执行。
2. 安装并登录 harness。Claude Code 最快：
```bash
curl -fsSL https://claude.ai/install.sh | bash
claude auth login
```
Windows PowerShell：
```powershell
irm https://claude.ai/install.ps1 | iex
claude auth login
```
Codex：
```bash
npm install -g @openai/codex
```
README 说明 Codex 要在 Tucano 内登录一次。
3. 安装 Tucano。Mac 下载 .dmg 后拖入 Applications；Ubuntu/Debian 系可执行：
```bash
sudo apt install ./tucano-linux-amd64.deb
```
其他 Linux 用 AppImage 时先加执行权限：
```bash
chmod +x tucano-linux-x86_64.AppImage
```
Windows PowerShell：
```powershell
irm https://github.com/eduwxyz/tucano/releases/latest/download/install.ps1 | iex
```
Mac 或 Linux 终端也可：
```bash
curl -fsSL https://github.com/eduwxyz/tucano/releases/latest/download/install.sh | sh
```
4. 首次运行按向导配置：选语言和姓名；勾选代理可用的 harness，每项有 Test now 可发真实问题；选路由频道和保存记忆用的模型；填写每个代理都应知道的背景；工具和技能可跳过；创建第一个代理，可选模板或从零开始。完成后进入 #general。
5. 建频道和团队：新建频道，加入代理。提问时可用 @ 指定代理，不指定则由路由器选谁回答。代理之间用 @ 交接，形成调查→修复→评审的链路。
6. 接工具：Connectors → Add，粘贴 MCP server 地址；OAuth 服务会打开浏览器，其他服务填 token。随后在每个代理页面按连接器设置 no access、read 或 read and write。README 明确支持 Jira、GitLab、GitHub、Slack、Linear、Figma、Notion、Datadog、Sentry 和公司内网 MCP server。
7. 设审批与限额：有影响的写操作等待确认；可选择 approve once、always allow safe one、或 refuse with reason，拒绝理由会被代理读到。Settings → Phone and GitHub 可接 Telegram 机器人，在手机上审批。给每个代理设月度 token 限额和单次回复上限；需要时用 Pause everything 一次停掉所有代理。
8. 管记忆和技能：在 Memory 页查看、批准、编辑、遗忘每条记忆；代理反复走同一路径时会提议 skill，即整个团队可照做的书面配方；Claude Code 和 Codex 已有 skills 可一键导入。
9. 设例程：Routines 可按日期时间触发，也可按连接器事件触发，例如新 issue、监控失败、邮件。周日历显示每次运行结果；quiet hours 可保持夜间安静。关闭窗口后 Tucano 留在托盘，例程和触发继续运行。
10. 给代理电脑/浏览器（可选）：可给 Docker 隔离 Linux 环境，或选择本机；借出文件夹或仓库；给独立 Chrome，可实时观看，并在需要登录时接管。
11. 看回执和报告：每条回复显示 searched、read、ran、edited，以及 token 和时间回执；Usage and limits 看每个代理月度用量和订阅窗口；weekly Report 看每个 issue 花了多少 token、多少回复、时间去了哪里。

## 对应的研究问题
1. 能力发现：README 明确说代理能互相对话、写代码、互审、调用工具，并在频道里从调查走到修复再走到评审；Tuca 可根据描述起草代理；代理会提议 skill 把重复路径写成团队配方。这些是可发现的新任务类型，但都属于项目自述能力。
2. 任务匹配：每个代理可选 harness 和模型，因此一个团队可混用：Opus 修复、GPT 评审、Haiku 路由。频道有路由器决定谁回答，代理也可用 @ 指定交接。工具按代理和按工具授权。README 还说明 Claude Code 只读 ~/.claude/settings.json 的 env 和 apiKeyHelper，hooks、插件和权限不进入；Codex 使用独立 home，避免个人 skills、AGENTS.md 和插件泄漏。
3. 条件供给：需要至少一个已安装并登录的 harness；需要订阅或公司 AI 网关；需要连接器地址、OAuth 或 token；需要给每个代理写角色、指令和工具权限；需要审核记忆和技能；需要审批写操作；需要时借出文件夹、仓库、Docker 电脑或浏览器。Tucano 在每轮重建上下文，包括 workspace、代理指令、记忆、技能和近期对话。
4. 主动推进：Routines 支持按日期时间或连接器事件触发；代理之间用 @ 交接，可让请求自行从调查走到修复和评审；关闭窗口后托盘继续运行例程和触发；quiet hours 控制夜间执行。
5. 效果验证：每条回复有 token 和时间回执，显示 searched、read、ran、edited；Usage and limits 看月度用量；weekly Report 看每个 issue 的 token、回复数和时间去向；审批卡显示 exact call 和参数。README 没有给任务质量、正确率或业务结果的量化验证方法，只给了成本和活动回执。

## 与已有做法的关系
清单中 Claude Code 状态为 adopt，OpenCode 状态为 watch。Tucano 不是替代它们，而是编排层：README 明确把 Claude Code、Codex、OpenCode、Pi 作为可选 harness，每个代理可选 harness 和模型。因此它可把单代理 CLI 扩展成多代理频道、按代理工具权限、审批和例程；OpenCode 在 README 中是可选 harness 之一。除这两项外，清单中没有相关条目。

## 证据与局限
证据：README 给出平台要求、安装命令、首次运行配置、连接器和按代理授权步骤、审批模型、记忆和技能流程、Routines 触发方式、架构图和本地数据位置。截图 alt 文本描述了一个示例：Iris 在 Datadog 找到错误，Leo 修复并开 merge request，Nico 评审并请求合并审批。但这是产品说明中的示例，不是独立测评。
数据：仓库 36 stars；README 未给 benchmark、用户数、任务成功率、成本对比或安全审计结果。本地存储、无 Tucano 服务器、密码不进数据库、每轮隔离、工具按代理授权等是作者主张，需要自行验证。
适用条件：需要受支持的桌面系统和至少一个 harness；Windows 安装包未代码签名，公司电脑可能被 IT 阻止；Linux 保存密码依赖系统 keyring；Docker 和 Chrome 可选但影响隔离电脑和独立浏览器体验。
局限：只能依据 README 判断，没有独立复现；多代理协作效果、审批体验、长期记忆质量、例程可靠性都未量化；36 stars 说明采用规模有限；不适合作为高安全场景的唯一控制。

## 怎么试、怎么验证
最小试用：选一个真实但低风险的小任务，例如修一个非关键 bug。建一个频道，放 2–3 个代理：一个用 Claude Code 修复，一个用 Codex 评审，可选一个做调查或路由；只接一个只读或低风险 MCP 连接器，例如 GitHub 或 GitLab 读 issue；只借出一个仓库文件夹；把 merge、post、email、delete、purchase 设为审批；开一个每周例程扫新 issue。
对照基线：同一类任务先用单人 Claude Code 或人工流程做 1–2 次，记录同样的指标。
判断指标：任务完成率；从开始到可评审 PR 的时间；评审轮次和返工次数；人工介入次数与审批等待时间；每个完成任务 token 成本，看 Usage 和 Report；被审批拦截的危险写操作次数，未授权执行应为 0；记忆或技能复用后同类任务时间是否下降。若任务完成率不降、周期缩短或返工减少，且没有未授权写操作，可认为有改善；否则只保留其审批和例程思路。
