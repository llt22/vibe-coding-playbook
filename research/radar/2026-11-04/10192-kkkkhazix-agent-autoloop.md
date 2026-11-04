# KKKKhazix/agent-autoloop

- 结论：**值得一试**。建议先小范围试：在一台 Mac/Linux 机器上安装 agent-autoloop，按内置 try 和一个低风险定时/巡检规则跑通“事件→Agent→人工拍板→续跑”闭环；原因是它把后台接活、挂起零消耗、卡片审批和审计做成了可配置流程，但真实业务、多通道和多 Agent 仍多为局部验证。
- 原文：https://github.com/KKKKhazix/agent-autoloop
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T06:22:03.070Z

## 是什么
Agent Autoloop 是 macOS/Linux 上的轻量自动化中台：把定时任务、GitHub Issue、HTTP 事件等变成标准事件，按本机 `rules.json` 派给已登录的命令行 Agent（内置支持 Claude Code、Codex、ACP，也可接任意“能接收提示词并打印最后一条回复”的命令），每轮干完就退出；遇到删数据、重启服务、花钱、对外发消息等需要拍板的事，推卡片到桌面/飞书/钉钉/企微/Slack/Discord，等待期间不占进程、不耗 Token，回答后接回原会话继续。核心链路是：事件→规则派活→单轮退出→人工审批→续跑。

## 具体做法
1. 准备环境。前提：macOS 或 Linux，已装 Node 24、Git、curl，并有一个已经登录好的命令行 Agent；不需要 GitHub 账号。建议先建沙盒目录：
```bash
mkdir -p ~/autoloop-sandbox/notes
```
2. 安装。前提：本机能运行 Node 24。
```bash
curl -fsSL https://raw.githubusercontent.com/KKKKhazix/agent-autoloop/main/install.sh | sh
```
3. 先走内置真实试跑，验证“提问→退出等回复→拍板→接着干完”。前提：已有一个可用的本机 Agent。
```bash
agent-autoloop try
agent-autoloop answer 1 2
agent-autoloop status
```
交互终端里直接输入数字回车；非交互终端用 `agent-autoloop answer 1 <序号>`。`status` 应显示它接上刚才的会话，并显示今天和最近 7 天的轮数、Token 和费用。
4. 写一条本机规则。前提：`to` 必须是 `agents` 里已登记的名字，`cwd` 换成实际目录。打开 `~/.agent-autoloop/rules.json`，在 `rules` 中放入类似对象：
```json
{
  "name": "早报",
  "when": { "cron": "0 9 * * *" },
  "to": "codex",
  "cwd": "~/notes",
  "prompt": "整理昨天的笔记和提交，写今天的早报。"
}
```
保存后几秒内自动生效；运行 `agent-autoloop check` 检查。改错了系统会继续按旧规则跑，并发卡片提醒哪里写错。
5. 接外部事件。前提：先按 `skills/agent-autoloop/SKILL.md#接一个事件插件` 在 `sources` 里登记 `github`。然后加规则：
```json
{
  "name": "处理 issue",
  "when": { "source": "github", "types": ["issues.opened"] },
  "to": "codex",
  "cwd": "~/code/app",
  "skill": "handle-issue",
  "parallel": 3
}
```
前提：`skill` 对应的任务 Skill 已放进所用 Agent 的 skills 目录；`parallel` 是并发数。改完运行 `agent-autoloop check`。
6. 约定 Agent 如何回执。中台对 Agent 只有一个约定：在最后一条回复里交代结果；需要请示时在回复末尾附 `agent-autoloop` 代码块。示例：
````text
订单已经核对完毕，库存充足。

```agent-autoloop
{
  "ask": [{
    "title": "怎么发货？",
    "text": "两种方式今天都能发出。",
    "options": ["快递", "自提"],
    "key": "shipping"
  }]
}
```
````
除 `ask` 外，还可用 `notice` 发通知、`resolve` 关闭已解决卡片、`later` 预约复查、`events` 触发新事件。前提：Agent 能输出最后一条回复；JSON 写错时中台只让它在原会话重写最后一段，不重做业务。
7. 启用现成模板。前提：先读对应模板 README。把任务 Skill 放进所用 Agent 的 skills 目录，把示例规则合入 `~/.agent-autoloop/rules.json`，替换电脑名和路径，再运行 `agent-autoloop check`。可用于每日早报、跟进 GitHub Issue、线上告警排查、用户反馈处理、网站巡检、飞书周报与业务摘要、PR 自动交付等。反馈处理、网站巡检和飞书摘要默认使用北京时间，只发给本人的飞书私聊。
8. 配人工拍板通道。桌面通知默认开启；飞书、钉钉、企微、Slack、Discord 按 `skills/agent-autoloop/SKILL.md#接一个通道` 配置。前提：文字通道要把 `hub.publicUrl` 配成手机或电脑能打开的地址，否则回答链接打不开。
9. 需要交付流水线时，给 GitHub PR 打上 `deliver` 标签，它会按“审代码→等 CI→合并 PR→等部署→核对线上版本”跟进。前提：仓库有对应 CI/CD；审查和交付配置只从 `main` 读取，不在接单电脑上检出或运行 PR 里的代码。
10. 日常查看和审计。前提：已产生至少一轮任务。
```bash
agent-autoloop status
agent-autoloop why 1
agent-autoloop check
```
`why 1` 用来看第 1 轮为什么跑、结果是什么。

## 对应的研究问题
- 能力发现：原文给出的可交给 AI 的工作不止写代码，还包括每日早报、GitHub Issue 跟进、线上告警排查、用户反馈处理、网站巡检、飞书周报与业务摘要、PR 自动交付。关键是把“定时/事件触发、单轮执行、需要时请示、事后复查”这类后台工作交给 Agent。
- 任务匹配：适合用规则描述“什么事、交给谁、在哪个目录干”的任务；Agent 侧按 Claude Code、Codex、ACP 或通用命令匹配；需要人工拍板的任务通过卡片走审批；可并行的任务可设 `parallel`；需要持续跟进的任务可用 `later` 预约复查。
- 条件供给：需要 Node 24、Git、curl、已登录的 CLI Agent；需要 `rules.json` 规则、任务 Skill、事件来源、通知通道和本地目录权限；文字通道还需要可达的 `hub.publicUrl`。中台通过“指令数据分离”把外部文字只当资料放进文件，不让事件里的 `cwd`、`agent`、`access` 字段直接控制本机执行。
- 主动推进：支持 cron 定时、GitHub `issues.opened`、HTTP 接口、Issue 轮询等触发；一轮结束进程退出，等待人工时零进程、零 Token；回答后接回原会话继续；支持预约复查和事件链，但用跳数熔断限制 Agent 自触发层数，超过 8 层只记录并通知。
- 效果验证：`status` 可看轮数、Token 和费用；`why` 可查每轮来龙去脉；`check` 可校验规则；原文还给了模拟、强杀和性能测试命令及数据，用于验证调度、持久化和崩溃恢复。

## 与已有做法关系
- 清单中的 Claude Code（adopt）：是本项目内置 Agent 之一，原文称已跑通多轮问答和跨进程会话续接。Agent Autoloop 不替代 Claude Code，而是在它外面加调度、审批、审计和持续跟进层。
- 清单中的 DeepSeek（try）：原文没有直接接入 DeepSeek 的实测证据；只给出了 DeepSeek Harness 的命令行接入命令，且未逐个跑过。
- 清单中的 DeepSeek Harness（watch）：原文列出的接入命令是 `dsh --profile headless {prompt}`，属于通用命令接入，未实测。
- 清单中的 Hermes（watch）：原文列出的接入命令是 `hermes chat -q {prompt}`，未实测。
- 清单中的 OpenClaw（watch）：原文列出的接入命令是 `openclaw agent exec {prompt}`，未实测。
- 清单中的 Cursor（watch）：原文列出的接入命令是 `agent -p --trust {prompt}`，未实测。
- 清单中没有 “Agent Autoloop” 自身条目；原文还支持 Codex，但清单未列 Codex。总体关系是：它是把已有 CLI Agent 组织成后台工作流的编排层，不是新的模型或 IDE。

## 证据与局限
- 原文给出的实测：Claude Code、Codex、ACP（官方 Codex ACP 适配器）跑通了多轮问答和跨进程会话续接；飞书跑通了发送、按钮回调和卡片更新。
- 原文给出的性能数据：内核约 1651 行、零运行时依赖；在 Apple M5 Pro、24 GB、Node 24.21.0 上冷启动 88.78 ms、空闲内存 59.94 MB RSS、1000 个同时等待的长轮询 170.49 MB RSS、持久化写入 2394 条/秒、派活 p99 1.82 ms、110 万条事实时启动 99.8 ms，格式变化后从日志全量重建 110 万条用时 43.1 秒。这些是项目自测，不是独立复现；达标线按该机器定，换机器可能不达标。
- 原文给出的验证案例：20 万步模拟断网、丢包、崩溃和重复提交；强杀进程 1000 次检查已确认记录不丢。但原文明确说整机断电没有单独测过。
- 局限：四种 Webhook 模板只在本地模拟服务上验证过；反馈处理、网站巡检和飞书摘要只使用虚构样例和假飞书 CLI，没有在真实账号上跑完整业务；其他命令行 Agent 的接入命令整理自官方文档，没有逐个跑过；没有独立第三方评测。
- 适用条件：macOS 或 Linux；需要 Node 24；高频自动化场景下，原文建议使用 API Key，而不是个人订阅额度；对外提供服务时要考虑凭据和权限边界。

## 怎么试、怎么验证
1. 最小闭环：安装后运行 `agent-autoloop try`，完成一次“Agent 提问→进程退出→`answer` 拍板→`status` 显示续跑完成”。通过标准是：等待期间没有 Agent 进程空转，回答后能接回原会话，`status` 能看到轮数和费用。
2. 选一个低风险、只读或只写沙盒的流程试 1—2 周。例如每日早报，把 `cwd` 指到 `~/autoloop-sandbox/notes`；或用网站巡检模板，只通知异常、不做重启和修复。不要一上来接生产写操作、删数据、对外发消息或自动合并 PR。
3. 设基线：试跑前记录人工完成同类任务的时间、遗漏次数、误报次数和人工介入次数；试跑后用 `status` 和 `why` 记录每轮轮数、Token、费用、从事件到产出的时间、人工拍板次数、误报/漏报、失败重试次数。
4. 判断改善：完成率上升、人工守终端时间下降、Token/费用可接受、审批卡片只在真正需要时出现、`why` 能解释每轮原因，才算改善；若出现未经授权的写操作、关键告警漏报、重复误报或人工时间没有下降，应停止扩大范围。
5. 扩大前再验证：先把通用命令接入的 Agent 单独跑通，再给最小权限；文字通道先确认 `hub.publicUrl` 安全可达；涉及 CI/CD 的 `deliver` 流水线先在非关键仓库试。
