# sksarvesh007/antiglaude

- 结论：**值得研读**。建议列为 study：把它当作“本地协议网关 + 运行可观测性”的案例研读，不建议直接接入真实账号或生产流程；原因是 README 给出的安装与配置步骤具体，但涉及从本地应用状态提取刷新凭证、规避上游标识/配额过滤，合规与安全风险高，且没有效果质量数据。
- 原文：https://github.com/sksarvesh007/antiglaude
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T19:20:06.338Z

## 是什么
Antiglaude 是一个本地协议网关/推理服务：把 Anthropic Messages 和 OpenAI Chat Completions 请求翻译成 Google Cloud Code/Gemini 执行格式，让 Claude Code CLI 和标准 OpenAI SDK 工具调用 README 列出的上游模型。它还提供终端控制面板、配额/延迟/请求日志、OAuth 刷新、JSON Schema 归一化、SSE keep-alive、macOS launchd 后台服务和 OpenAI 兼容 `/v1/chat/completions`。本质上不是模型，而是模型路由与运行可观测层。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
仅作为隔离环境复现其网关思路，不建议直接接入真实企业账号或生产凭证。
1. 前提：Python 3.10+，本机可访问 Google Cloud Code/Gemini 上游账号；准备隔离测试账号，不使用生产凭证。安装：
```bash
pip install antiglaude
# 或
uv tool install antiglaude
# 或免安装运行
uvx antiglaude start
```
2. 启动本地网关，README 称默认绑定 `127.0.0.1:8080`：
```bash
antiglaude start
```
3. 打开终端控制面板查看账号、配额、延迟、请求日志：
```bash
antiglaude tui
```
4. 配置 Claude Code 系统级接入（README 称会写 `~/.claude/settings.json` 并设置 model picker）：
```bash
antiglaude setup-claude
```
关键环境变量为：
```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8080
export ANTHROPIC_API_KEY=test
export CLAUDE_CODE_AUTO_MODE_SERVER=0
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
```
5. 在 Claude Code 会话里用 `/model` 切换 README 列出的模型；或让 OpenAI 兼容客户端指向 `http://127.0.0.1:8080/v1`，api_key 用 `test`。README 的模型适配建议是：agentic/coding/tool calling 用 `claude-sonnet-4-6`，复杂推理/架构用 `claude-opus-4-6-thinking`，低延迟/高并发用 `gemini-3-flash`，大上下文分析用 `gemini-2.5-pro`。
6. macOS 可安装后台守护：
```bash
antiglaude daemon install
```
7. 运行测试：
```bash
make test
```
注意：README 明确写到会从本地应用状态提取永久刷新凭证、清理身份标记和上游不支持的元数据；这些是高风险且可能违反服务条款的行为，不能当作生产推荐。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- 能力发现：把 Claude Code/OpenAI SDK 的现有调用面扩到 Gemini/其他上游模型，并暴露配额、延迟、请求日志；这能发现“同一工具换模型/换供应商”的迁移与监控工作。
- 任务匹配：README 给出模型分工——Claude Sonnet 面向 agentic、编码、工具调用；Opus Thinking 面向复杂推理、数学、架构；Gemini Flash 面向低延迟、摘要、高并发；Gemini Pro 面向大上下文分析。也支持 `/model` 会话内切换。
- 条件供给：需要本地网关常驻、`ANTHROPIC_BASE_URL` 等环境变量、`~/.claude/settings.json` 的 modelPicker、可用的上游账号和凭证；反馈来自 TUI 的配额/延迟/请求日志。
- 主动推进：macOS launchd 可开机自启并 KeepAlive，README 还声称有 token 自动刷新、限流退避和 SSE keep-alive，适合由后台服务持续承接请求。
- 效果验证：能看请求状态、延迟、token 用量、每日配额和模型切换，属于运行层可观测性；但 README 没有给出任务质量、正确率或业务结果指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中 `Claude Code` 是 adopt；Antiglaude 是 Claude Code 的本地网关/模型切换层，属于增强而非替代。`Cursor` 是 watch；README 明确说 Cursor/Continue 可配置自定义 OpenAI provider 指向该网关，因此可作为 Cursor 接其他模型的试验路径。`Context Mode` 是 watch；README 没有提到与上下文模式相关的能力，清单中没有直接对应条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
证据：README 提供了 PyPI/CI/Release 徽章、安装命令、Makefile 目标、`~/.claude/settings.json` 配置片段、TUI 截图、模型目录、OpenAI 兼容调用示例，并声称 18 个单元测试不消耗上游配额；仓库有 51 stars。这些说明项目至少有可运行的脚手架和文档，但都来自项目自述。
局限：没有独立性能/质量对比，没有成本节省或任务成功率数据；未审计源码；模型名称和界面日期看起来较新/未来化，需自行核验。最大风险是 README 自述会“从本地应用状态提取永久刷新凭证”“中和身份标记”“清理上游不支持的元数据”，这涉及凭证安全、服务条款和上游风控，不能直接用于生产。运行条件包括 Python 3.10+、可用的 Google Cloud Code/Gemini 账号；后台守护目前只写 macOS launchd。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
先做合规和安全审查，再在隔离虚拟机、测试账号、无生产数据的环境中试。最小步骤：安装并启动网关，运行 `make test`；用一条固定 prompt 分别通过 OpenAI 兼容端点和 Claude Code 的 `/model` 调用；检查 TUI 日志、token 计数、配额计数和流式输出。验证指标：协议兼容成功率、流式输出完整性、工具调用成功率、p95 延迟、token 统计与上游账单一致性、配额计数准确性、模型切换成功率、凭证是否泄露、是否触发上游风控；并与直连官方 API 或现有 Claude Code 配置做 A/B。若要判断“改善了结果”，还需固定任务集做通过率/人工评分对比，不能只看延迟和配额。
