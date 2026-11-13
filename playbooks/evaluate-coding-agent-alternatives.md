# 在真实仓库里小范围试用开源编码 agent

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在不贸然替换现有编码工具的前提下，用真实代码库判断 Qwen Code 这类开源多协议编码 agent 是否值得扩大使用。
> 先试这一步：选一个真实代码库和一名工程师，按 README 完成安装与认证，先跑仓库解释任务，再与现有工具用同一提交、同一提示词做一个小修复对照。
> 最近修订：2026-11-13

## 解决什么问题

在不贸然替换现有编码工具的前提下，用真实代码库判断 Qwen Code 这类开源多协议编码 agent 是否值得扩大使用。核心做法是：按 README 跑通安装、认证、仓库解释、小修复和可选的 headless/daemon，再与现有工具用同一提交、同一提示词做对照，记录可观察指标后决策。

## 适用与不适用

适用：已有代码仓库，团队希望留在终端或编辑器内完成仓库理解、编码和测试；想评估开源、多协议、可接本地模型的编码 agent；已用 Claude Code，想找一个开源替代或对照；需要脚本/CI 批处理、或多客户端共享长会话、或从聊天入口触发。

不适用：没有明确项目目录、没有订阅账号/API key/模型配置；需要厂商级支持承诺或独立安全审计；要在共享或不可信主机上按默认无认证方式开放 daemon；把 1.0 Preview 与主版本混用；希望直接默认替换现有工具而不做对照。README 没有给出“哪类任务该用哪个模型、子代理或协作方式”的具体选择规则，不能据此编造匹配表。

## 前置条件

- 系统：Linux/macOS 或 Windows；若走 NPM，需要 Node.js 22+。
- 一个真实项目目录，任务可回退。
- Qwen Plus/Pro 订阅账号，或按认证文档配置好的 API key、第三方或本地模型。认证与设置细节以 README 指向的 Authentication Guide 和 Settings Reference 为准。
- 网络和相应系统安装权限。
- 若做对照：现有工具、同一提交、同一提示词，以及试用前写好的通过标准。
- 若试 daemon：先在 loopback 本机验证；共享或不可信主机必须准备 `QWEN_SERVER_TOKEN` 和 `--require-auth`。

## 操作步骤

1. 先定试用边界。选一个真实代码库和一名工程师，准备三类任务：仓库解释；一个 1–2 小时可完成且带测试的小修复；一个代码审查或测试总结任务。若团队已用 Claude Code，先记录同一提交、同一提示词下的基线结果。前提：任务真实、可回退；预期结果：拿到基线输出，并在开始前写明通过标准，例如“同一小修复能完成且测试通过、无回归，人工修改量低于预设上限”。该标准是试用设计，不是调研原文数据。

2. 安装。前提：满足上面的系统和网络条件。做法 A：独立安装脚本——Linux/macOS 用：

```bash
curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash
```

Windows 用：

```powershell
irm https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.ps1 | iex
```

做法 B：包管理器——NPM 或 Homebrew：

```bash
npm install -g @qwen-code/qwen-code@latest
# 或
brew install qwen-code
```

怎么选：没有 Node/Homebrew 或想按 README 主路径，用 A；已有 Node.js 22+ 或 Homebrew，用 B。安装后重启终端，让环境变量生效。预期结果：终端能识别 `qwen` 命令。

3. 认证。前提：项目目录存在，账号或密钥可用。执行：

```bash
cd /path/to/your-project
qwen
```

进入会话后运行 `/auth`，选择 Qwen Account with Subscription 并用 Plus/Pro 订阅登录；或按认证文档配置 provider 的 API key。预期结果：会话可用并能发请求。具体认证细节以 README 链接文档为准。

4. 跑首个探索任务。在项目目录的会话里使用 README 示例提示词：

```text
Explain this repository and show me where to start.
```

预期结果：得到仓库解释和起步位置；记录首次可用输出时间，并与基线对照。

5. 做小修复对照。用同一提交、同一提示词分别让现有工具和 Qwen Code 做那个 1–2 小时小修复，并要求运行相关测试。预期结果：得到代码改动和测试结果；记录完成率、测试通过率、回归数、人工修改次数或行数、人工接管次数、token/API 成本，以及是否发生越权或意外文件改动。不要只看最终 diff，保留过程记录。

6. 需要脚本、CI/CD 或批处理时，加 headless 只读检查。前提：已完成认证，运行环境允许访问代码；先单开分支，只给只读检查权限。命令：

```bash
qwen -p "..."
```

把省略号替换为任务提示词。预期结果：得到可脚本化的输出；先跑只读检查，避免一开始就给写权限。

7. 只有需要浏览器、编辑器、SDK 和自动化客户端共享长会话时，才启 daemon。前提：先在本机 loopback 验证，不在共享或不可信主机按默认无认证方式开放。启动：

```bash
qwen serve --open
```

默认地址为 `http://127.0.0.1:4170`。后台管理用：

```bash
qwen daemon start
qwen daemon status
qwen daemon logs -f
qwen daemon stop
```

安全前提：README 说明默认只监听 loopback 且没有 bearer 认证，本机任何能访问该端口的进程都可使用完整 API，包括代码执行；共享或不可信主机应设置 `QWEN_SERVER_TOKEN` 并使用 `--require-auth`。预期结果：多客户端可共享长会话；先验证 token 和 `--require-auth` 生效，再考虑暴露。

8. 按需接编辑器、聊天通道或 1.0 Preview。前提：主版本试用已跑通；1.0 Preview 看 `v1.0.0-preview` 分支和 1.x 文档，不要与主版本命令混用。做法：按 README 链接配置 VS Code、Zed、JetBrains、Desktop、Web UI，或 Telegram、DingTalk、WeChat、Feishu；聊天通道启动命令为 `qwen channel start`。预期结果：集成入口可用。注意这些集成的具体配置 README 未展开，不能照猜。

9. 复盘决策。把 Qwen Code 与现有工具的同一任务结果并排看：满足预设通过标准且无安全或越权问题，再扩大；否则保留为开源、多模型、多入口的对照，不默认替换 Claude Code。预期结果：形成一份可复核的试用结论，而不是只凭 benchmark 或 star 数。

## 怎么判断变好了

最小试用：一个真实代码库、一名工程师，跑完“仓库解释—小修复—代码审查或测试总结”一轮；若团队已用 Claude Code，用同一提交、同一提示词做对照。调研没有给出固定试用天数，不要编造固定周期；以完成一轮任务闭环为最小门槛，再决定是否扩大。

可观察指标：任务完成率、首次可用输出时间、测试通过率与回归数、人工修改次数或行数、代码审查意见采纳率、需要人工接管次数、token/API 成本，以及是否发生越权或意外文件改动。建议试用前预设通过标准，例如“同一小修复任务能完成且测试通过、无回归，人工修改量低于预设上限”再决定是否扩大；该标准是试用设计，不是原文数据。

最终判断看本地任务结果和同一条件下的对照，不只看 SWE-bench 分数或 star 数。

## 常见坑

- 把 README 的功能对齐表、SWE-bench 分数、star 数当成独立验证。README 主要是作者自述和自报基准，没有用户案例、失败率、成本、时延、安全审计或第三方复现。
- 把基准结果外推到所有 provider 或本地模型。给出的 SWE-bench Verified 结果使用同一 Qwen 3.7 Max 模型，不代表换模型后的表现。
- 在共享或不可信主机上按默认方式开放 daemon。默认只监听 loopback 且没有 bearer 认证，本机任何能访问端口的进程都可使用完整 API，包括代码执行。
- 把 1.0 Preview 和主版本混用。Preview 是单独分支，需另看 1.x 文档。
- 一开始就在 CI 给 headless 写权限。先单开分支跑只读检查，再逐步扩大权限。
- 只跑仓库解释就下结论。至少要覆盖一个小修复和一次审查或测试总结，并与现有工具同条件对照。
- 安装后忘记重启终端，导致环境变量未生效。
- 认证细节、设置、daemon、隐私等只看 README 主文。调研只读 README，未读完整文档也未实测，实际配置要按链接文档核对。
- 把 SubAgents、Agent Teams、Skills、Plan Mode、MCP、LSP 等功能名当成任务匹配规则。README 没有给出具体选择规则，不能编造匹配表。
- 把 Qwen Code 当作默认替换。更稳妥的定位是开源、多模型、多入口的替代或对照。

## 证据与来源

本篇操作步骤来自调研《QwenLM/qwen-code》对 README 的整理。可验证材料包括：完整安装命令、`qwen` 启动流程、`/auth` 认证入口、headless 的 `qwen -p`、daemon 启停命令和默认地址、各接口入口、SDK 示例；SWE-bench Verified 上七个 Qwen Code 版本平均 76.40%–77.80%，使用同一 Qwen 3.7 Max 模型、500 个任务、每个版本三次试验；输入元数据约 2.99 万 stars、当日 151 stars，但这只是热度信号。

属于作者主张而非独立证据：与 Claude Code 功能对齐、Agentic out of the box、zero setup、开源无 vendor lock-in、项目用自身 agent 提交 issue/PR/审查/测试、动态工作流等。README 没有给用户案例、失败率、成本、时延、安全审计或第三方复现。

局限：调研只读 README，未读认证、设置、daemon、隐私等完整文档，也未实测安装；安装需要网络和相应系统权限；认证依赖 Qwen 订阅或 API key；基准使用 Qwen 3.7 Max，不代表换用其他 provider 或本地模型时的表现；daemon 默认无 bearer 认证，共享主机有安全风险；1.0 Preview 与主版本是不同分支，不能混用结论。本文的通过标准示例是试用设计，不是原文数据。

## 依据的调研

- [QwenLM/qwen-code](../research/radar/2026-11-13/13090-qwenlm-qwen-code.md)：值得一试，建议把它作为 Claude Code 的开源、多协议替代方案做小范围试用：在单个代码库中按 README 完成安装、认证，并运行仓库解释、修复和 headless 任务，再与现有工具对比完成率、测试通过和人工介入；原因是 README 给出了可执行的安装与交互命令，但证据主要是作者自述和自报基准，缺少独立验证。
