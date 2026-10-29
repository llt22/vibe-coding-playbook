# Claude Code burns ~15–20% of your tokens on a 3-word status line

- 结论：**值得一试**。建议在 Linux 单机、非关键项目的 Claude Code 上小范围试用：用 Bun preload 关闭 agent_summary，并以日志和 OpenTelemetry 验证 agent_summary 归零且没有替代 side-query。先不要全量默认采用，因为该方案非官方、依赖版本内部字符串、仅 Linux 实测，升级后可能静默失效，并需自行检查服务条款。
- 原文：https://gist.github.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T04:11:34.723Z

## 是什么
Claude Code 的 `agent_summary` 是一个后台摘要 side-query：约每 30 秒、对每个后台 agent，把该 agent 的整个 transcript 发给它自己的模型（通常是 Opus），要求用 3-5 个词描述最近动作。结果只更新 agents panel 的状态行，不进入模型或你的对话。原文称 2.1.232（2026-08）起默认开启，且没有设置可以关闭。

本文给出一个 MIT 许可的非官方 Bun preload 脚本（约 80 行），不修改二进制，通过 `BUN_OPTIONS=--preload` 注入：包裹 `setTimeout` / `setInterval`，当回调源码文本包含摘要器锚点（如 `[AgentSummary] Timer fired`）时，返回一个惰性 handle 而不是真正装载定时器；其他定时器原样通过。效果是关闭 `agent_summary`，可见变化是每个 agent 的面板状态停止更新，SDK 的 `task_progress` 没有 summary；子代理、后台代理、forked skills 和后台会话仍正常运行，只跳过 summary fork。

## 具体做法
1. 确认前提：原文实测平台为 Linux x64，Claude Code 版本 2.1.257–2.1.312；macOS 和 Windows 未测，Windows 上 `/$bunfs/` 门控很可能不会安装 hook。需要能设置环境变量、重启 Claude Code daemon，并自行检查修改客户端运行时行为是否违反服务条款。
2. 把脚本下载到稳定路径，并记住绝对路径。前提：`~/.local/share` 存在或先创建。
```bash
curl -fsSL https://gist.githubusercontent.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce/raw/no-agent-summary.js -o ~/.local/share/no-agent-summary.js
```
3. 最小试用时，只在当前 shell 注入 preload，不要先写全局配置。前提：当前 shell 能启动 Claude Code。
```bash
export BUN_OPTIONS="${BUN_OPTIONS:+$BUN_OPTIONS} --preload $HOME/.local/share/no-agent-summary.js"
```
4. 要永久化，可把同样的 export 写进 `~/.profile`、`~/.bashrc` 或 `~/.zshrc`；原文还给出 fish、systemd user env 和 PATH wrapper 写法，选一种即可。前提：每个启动 Claude Code 的进程都必须继承 `BUN_OPTIONS`，包括 `claude -p`、cron、CI 和编辑器集成。
```bash
# ~/.profile, ~/.bashrc, ~/.zshrc
export BUN_OPTIONS="${BUN_OPTIONS:+$BUN_OPTIONS} --preload /abs/path/no-agent-summary.js"
```
5. 重启 daemon 和所有已运行会话，然后从带有 `BUN_OPTIONS` 的环境启动 Claude Code。前提：daemon、pty host 和 pre-warmed bg-spare 会继承启动 daemon 的客户端环境；早于环境变量启动的 daemon 会继续产生未挂钩会话。
```bash
claude daemon stop --any
```
6. 可选 A/B 对照：设置 `CC_AGENT_SUMMARY_MODE=pass` 会加载 hook 但不过滤，所有定时器原样装载，摘要会回来；默认是 `off`，其他值会在 stderr 警告并按 `off` 处理。前提：只在验证时用 pass。
7. 验证 preload 是否加载。前提：路径必须是绝对路径。
```bash
BUN_OPTIONS="--preload $HOME/.local/share/no-agent-summary.js" CC_AGENT_SUMMARY_LOG=/tmp/nas.log claude --version && cat /tmp/nas.log
```
期望日志出现 `preload active mode=off …`。没有这一行，说明 `BUN_OPTIONS` 没到达进程，或路径不是绝对路径。
8. 验证摘要定时器是否被抑制：用同样的 `BUN_OPTIONS` 和 `CC_AGENT_SUMMARY_LOG=/tmp/nas.log`，运行一个后台子代理一到两分钟。日志应出现 `summary timer #1 suppressed (setTimeout, delay=30000)`，并且该 agent 的面板状态停止更新。如果导出 OpenTelemetry，查询 `query_source = agent_summary` 应保持为 0；原文称这是唯一能捕获所有失败模式的检查。
9. 每次升级 Claude Code 后重跑第 7、8 步。原文的失败模式是 fail-open：更新可能重命名日志行或 query-source id、用 `fn.bind(...)` 包装回调、把字符串移到回调外的共享常量，或把定时器移到 `timers/promises`、scheduler loop 等未包裹 API；此时 hook 匹配不到，摘要会静默恢复。
10. 可选观测：`CC_AGENT_SUMMARY_LOG` 记录 preload 加载、前 20 个匹配定时器和退出计数；`CC_AGENT_SUMMARY_MARKER` 在加载时写入 active 行。脚本用 `2^31−1` ms 作为惰性定时器，因为 Node/Bun 会把更大的 delay 当作 1 ms，不能用无限 delay。

## 对应的研究问题
- 能力发现：原文展示了把 AI 自身运行开销纳入审计的具体入口——在 Claude Code 的 OpenTelemetry 导出中按 `query_source` 分组 `claude_code.api_request` 事件，从而发现 `agent_summary` 这项隐藏模型调用。这属于“AI 已经在做、但用户可能没想到”的后台工作，而不是新的业务能力。
- 任务匹配：原文给出一个明确的反例——用 Opus 和完整 transcript 做 3-5 词状态行摘要，输入 token 与输出 token 比约 9000:1；更便宜的 short mode（约 2k token notes，可选更小模型）已在 2.1.310 中存在但默认关闭。可提炼的匹配原则是：低价值、高频、只更新 UI 的摘要任务不应默认交给大模型和全量上下文。
- 条件供给：需要 Linux 环境、匹配的 Claude Code 版本、Bun preload、脚本绝对路径、`BUN_OPTIONS` 环境继承、daemon 重启；反馈条件包括 `CC_AGENT_SUMMARY_LOG`、`CC_AGENT_SUMMARY_MARKER`、A/B 的 `CC_AGENT_SUMMARY_MODE=pass` 和 OpenTelemetry 的 `query_source = agent_summary`。权限上需要能改环境变量、重启 daemon，并能判断是否违反服务条款。
- 主动推进：`agent_summary` 本身就是由约 30 秒定时器持续触发的后台任务；原文的修复也是按定时器回调的源码锚点做条件抑制。可借鉴的是：时间触发的后台 AI 任务必须可审计、可关闭、可用 A/B 验证，并且每次版本更新后由“升级事件”触发重新验证。
- 效果验证：原文给出的验证信号包括 preload 加载日志、`summary timer … suppressed` 日志、面板状态停止更新、OpenTelemetry 中 `agent_summary` 请求数和花费份额归零、A/B 的 pass 模式让摘要恢复、以及升级后重验。

## 与已有做法关系
清单中已有 Claude Code（tool，adopt）。本文不改变是否采用 Claude Code，而是给已采用者一个可选的运行时成本治理补丁：关闭其默认开启的 `agent_summary` side-query。清单中没有其他相关条目。

## 证据与局限
原文给出的数据：DRIM 在 Claude Code OpenTelemetry 导出中发现，`agent_summary` 曾占全部 Claude Code 花费 16.4%（主对话为 15.7%）、占全部 API 请求 19.7%，其中 96% 的花费在 Opus 上，输入 token 与输出 token 比约 9000:1；原文还引用 #86879 收集的四个独立测量为 18–26%。版本表给出 2.1.257、2.1.280、2.1.301、2.1.308、2.1.310、2.1.312 的静态检查和动态 fork 计数，例如 2.1.312 为 5/5/0（无 hook / hook pass / hook off）。作者称在 2.1.301 上自 2026-10-26 日常使用以来 `agent_summary` 请求为 0，且没有其他 side-query 增长到替代它。周花费份额从 7 月的 3.5–7% 升到 7.3%、11.8%，10 月中约 16%。开销方面，原文给出一次测量：`claude --version` 从约 10 ms 到约 17 ms。

需要区分：上述遥测数字是原文/作者及其引用来源的测量；成本是 Claude Code 自身按请求估算的 `cost_usd`，不是发票，订阅用户损失的是速率限制余量。作者关于“没有设置可关”“SDK option 是 OR 的一项且代码路径都设为 true”“间隔来自服务端 flag 且 30–240 秒、默认已是最小且不能禁用”“98% 调用重读缓存、2% 冷缓存承载超过三分之一成本”“成本工具读 transcript 看不到、只有 OTel 能看到”“2.1.310 的 short mode 默认关闭”等，属于作者对二进制的分析或主张，原文没有给出可独立复现的全部证据。

局限：方案非官方，可能与服务条款冲突；只在 Linux 实测，macOS/Windows 未测，Windows 很可能不装 hook；依赖特定版本的内部字符串，升级后 fail-open；可见代价是面板状态不再更新、SDK `task_progress` 没有 summary；`timers/promises`、`bind`、共享常量、scheduler loop 等写法会绕过匹配；延迟开销只有一次测量。适用条件是 Linux 上的 Claude Code 2.1.257–2.1.312、能控制环境变量和 daemon 重启、接受非官方风险，并能用日志或 OTel 做验证。

## 怎么试、怎么验证
最小试用：在 Linux 单机、非关键项目上，先用当前 shell 的临时 `BUN_OPTIONS` 或 PATH wrapper，不写全局配置；先检查服务条款；按第 2–5 步下载、注入、重启 daemon；用 `CC_AGENT_SUMMARY_LOG=/tmp/nas.log` 确认 `preload active mode=off`；跑一个后台子代理一到两分钟，确认出现 `summary timer … suppressed` 且面板状态停止更新。若可用 OpenTelemetry，查询 `query_source = agent_summary` 应为 0。再做一次 `CC_AGENT_SUMMARY_MODE=pass` 对照，确认摘要会恢复，以证明 off 的结果来自 hook。

判断改善的指标：`agent_summary` 请求数和花费份额降到 0；没有其他 side-query 增长来替代；主子代理、后台代理、forked skills 和后台会话仍正常；面板状态停止更新属于预期副作用；`claude --version` 的启动延迟开销可接受（原文一次测量约 10→17 ms）；每次升级后重验仍为 0。若日志没有 `preload active`，或 OTel 中 `agent_summary` 仍非 0，则未生效。没有 OTel 时，只能用日志和面板状态做弱验证，结论应相应降级。回滚方式是移除 `BUN_OPTIONS` 并重启 daemon。
