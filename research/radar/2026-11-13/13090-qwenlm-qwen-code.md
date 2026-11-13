# QwenLM/qwen-code

- 结论：**值得一试**。建议把它作为 Claude Code 的开源、多协议替代方案做小范围试用：在单个代码库中按 README 完成安装、认证，并运行仓库解释、修复和 headless 任务，再与现有工具对比完成率、测试通过和人工介入；原因是 README 给出了可执行的安装与交互命令，但证据主要是作者自述和自报基准，缺少独立验证。
- 原文：https://github.com/QwenLM/qwen-code
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T06:29:02.275Z

## 是什么
Qwen Code 是 README 所称的“终端内开源 AI 编码智能体”，并扩展到编辑器、桌面、浏览器和聊天。它支持 OpenAI、Anthropic、Gemini、Qwen API 以及本地 Ollama/vLLM，提供 SubAgents、Agent Teams、Auto-Memory、Auto-Skills、MCP、Plan Mode、LSP、Headless、SDK、Daemon、IM 通道等。主版本按 README 的安装说明使用；1.0 Preview 是单独分支，需另看对应文档。README 还说明它最初基于 Google Gemini CLI v0.8.2，从 v0.1 起停止同步上游并独立开发。本文只依据该 README，未读完整文档，也未实测安装。

## 具体做法
1. 准备条件：Linux/macOS 或 Windows；若走 NPM 需 Node.js 22+；准备一个项目目录；准备 Qwen Plus/Pro 订阅账号，或按认证文档配置 API key、第三方或本地模型。前提是安装命令和认证方式以 README 链接文档为准。
2. Linux/macOS 安装：
```bash
curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash
```
3. Windows 安装：
```powershell
irm https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.ps1 | iex
```
4. 也可用 NPM 或 Homebrew：
```bash
npm install -g @qwen-code/qwen-code@latest
# 或
brew install qwen-code
```
5. 安装后重启终端，让环境变量生效（README 明确要求）。
6. 在项目目录启动：
```bash
cd /path/to/your-project
qwen
```
7. 会话内认证：运行 `/auth`，选择 Qwen Account with Subscription 并用 Plus/Pro 订阅登录；或配置 provider 的 API key。前提是账号或密钥可用，具体设置见 README 指向的 Authentication Guide 和 Settings Reference。
8. 首个探索任务可直接用 README 示例提示词：
```text
Explain this repository and show me where to start.
```
9. 需要脚本、CI/CD 或批处理时用 headless：
```bash
qwen -p "..."
```
把省略号替换为任务提示词；前提是已完成认证，且运行环境允许它访问代码和执行所需命令。
10. 需要浏览器、编辑器、SDK 和自动化客户端共享长会话时，启 daemon：
```bash
qwen serve --open
```
默认地址为 `http://127.0.0.1:4170`；后台管理用：
```bash
qwen daemon start
qwen daemon status
qwen daemon logs -f
qwen daemon stop
```
安全前提：README 说明默认只监听 loopback 且没有 bearer 认证，本机任何能访问该端口的进程都可使用完整 API，包括代码执行；在共享或不可信主机上应设置 `QWEN_SERVER_TOKEN` 并使用 `--require-auth`。
11. 可选集成：按 README 的链接配置 VS Code、Zed、JetBrains、Desktop、Web UI，或 Telegram、DingTalk、WeChat、Feishu 聊天通道；聊天通道启动命令为 `qwen channel start`。这些集成的具体配置 README 未展开，需看对应文档。
12. 若要试 1.0 Preview，按 `v1.0.0-preview` 分支和 1.x 文档另行安装配置，不要与上面的主版本命令混用。

## 对应的研究问题
- 能力发现：README 明示的能力包括解释仓库、在终端做编码任务、通过 headless 在脚本/CI/CD/批处理中运行、通过 SDK 集成、通过 Daemon 提供多客户端共享会话、通过 IM 通道从聊天触发，以及 Computer Use 桌面自动化。README 还声称项目用自身 agent 和模型提交 issue、PR、审查代码和跑测试，但这属于作者自述，不是独立案例。
- 任务匹配：适合已有代码仓库、希望留在终端或编辑器内完成编码与仓库理解的任务；支持多协议和本地模型，切换 provider 的灵活性较高。README 列出了 SubAgents、Agent Teams、Skills、Plan Mode、MCP、LSP 等能力，但没有给出“哪类任务该用哪个模型、子代理或协作方式”的具体选择规则，不能据此编造匹配表。
- 条件供给：需要项目目录、认证账号或 API key、模型/provider 配置；可选提供 MCP、LSP、IDE/聊天集成、SDK/daemon 客户端。README 提到 Sandbox、Hooks、Auto-Memory、Auto-Skills 等，但未给配置细节；daemon 场景还必须考虑认证 token 和网络暴露面。
- 主动推进：有依据的触发或持续能力包括 headless 用于 CI/CD 和批处理、daemon 作为长期服务供多客户端重连、IM 通道从聊天启动、内置 `/loop` `/batch` 等 Skills（README 只列名称，未展开触发条件）。哪些工作可由时间、事件或状态触发并持续完成，README 没有给出完整机制，只能作为试用方向。
- 效果验证：README 给出 SWE-bench Verified 的基准结果，但没有给工作流层面的 A/B 方法、成本、时延或人工介入指标。因此效果验证需要本地自建，不能直接引用榜单替代。

## 与已有做法的关系
- 对已有条目 Claude Code（adopt）：Qwen Code README 明确把自己与 Claude Code 对比，并声称在 SubAgents、Agent Teams、Skills、MCP、Plan Mode、LSP、Sandbox、Git Worktrees、Computer Use、IDE 插件、SDK、Headless 等方面达到功能对齐；同时列出 Claude Code 没有的开源模型与框架、多协议、Agent Arena、Daemon、IM 通道。若团队已采用 Claude Code，Qwen Code 更适合作为“开源、多模型、多入口”的替代或对照，而不是默认替换。
- 对已有条目 OpenClaw（watch）：README 的生态部分给出“Qwen Code Claw”，通过 ACP 让其他 agent（Claude、Codex 等）把编码任务委派给 Qwen Code。这说明二者可组合，但 OpenClaw 本身仍是 watch，不应据此升级。
- 对已有条目 Trendshift（watch）：只是来源或热度信号，不构成工作方法。README 还说明项目最初基于 Gemini CLI v0.8.2，这可作为技术谱系参考。

## 证据与局限
- 原文给出的可验证材料：完整安装命令、`qwen` 启动流程、`/auth` 认证入口、headless 命令、daemon 启停命令和默认地址、各接口入口、SDK 示例；SWE-bench Verified 上七个 Qwen Code 版本平均 76.40%–77.80%，使用同一 Qwen 3.7 Max 模型、500 个任务、每个版本三次试验；功能对比表。输入元数据还显示约 2.99 万 stars、当日 151 stars，但这只是热度信号。
- 属于作者主张而非独立证据：与 Claude Code 功能对齐、“Agentic out of the box”“zero setup”、开源无 vendor lock-in、项目用自身 agent 提交 issue/PR/审查/测试、动态工作流等。README 没有给用户案例、失败率、成本、时延、安全审计或第三方复现。
- 适用条件与局限：本文只读 README，未读认证、设置、daemon、隐私等完整文档，也未实测；安装需要网络和相应系统权限；认证依赖 Qwen 订阅或 API key；基准使用 Qwen 3.7 Max，不代表换用其他 provider 或本地模型时的表现；主要面向编码和终端工作，不能直接外推到所有工作；daemon 默认无 bearer 认证，共享主机有安全风险；1.0 Preview 与主版本是不同分支，不能混用结论。

## 怎么试、怎么验证
- 最小试用：选一个真实代码库和一名工程师，按 README 完成安装与认证；先跑 `Explain this repository and show me where to start.`，再选一个 1–2 小时可完成的小修复（带测试）和一个代码审查或测试总结任务；如果团队已用 Claude Code，用同一提交、同一提示词做对照。需要自动化时，再单开一个分支试 `qwen -p` 在 CI 中跑只读检查，避免一开始就给它写权限。
- 记录指标：任务完成率、首次可用输出时间、测试通过率与回归数、人工修改次数或行数、代码审查意见采纳率、需要人工接管次数、token/API 成本，以及是否发生越权或意外文件改动。建议试用前预设通过标准，例如“同一小修复任务能完成且测试通过、无回归，人工修改量低于预设上限”再决定是否扩大；该标准是试用设计，不是原文数据。
- 安全验证：若试 daemon，先在 loopback 本机验证，再检查 `QWEN_SERVER_TOKEN` 与 `--require-auth` 是否生效；不要在共享主机上按默认无认证方式开放。最终判断应看本地任务结果，而不是只看 SWE-bench 分数或 star 数。
