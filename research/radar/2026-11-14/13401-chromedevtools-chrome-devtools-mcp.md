# ChromeDevTools/chrome-devtools-mcp

- 结论：**值得一试**。建议在前端/Web 调试与验证场景小范围试用：照 README 配置 MCP server 或 CLI，让编码智能体打开页面、抓 console/network、截图并录性能 trace；理由是配置和首个验证 prompt 可直接照做，但官方只支持 Chrome，且会把浏览器内容暴露给 MCP 客户端，需先隔离敏感数据。
- 原文：https://github.com/ChromeDevTools/chrome-devtools-mcp
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T06:54:06.700Z

## 是什么
`chrome-devtools-mcp` 是 Chrome DevTools 团队提供的 MCP server，也带 CLI，让编码智能体（Antigravity、Claude、Cursor、Copilot 等）控制并检查一个运行中的 Chrome。它把 Chrome DevTools 的能力交给 AI 编码助手，用于自动化、调试和性能分析。核心能力包括：录制 trace 并提取性能洞察；分析网络请求、截图、检查浏览器 console 消息（带 source-mapped stack traces）；用 puppeteer 执行自动化并自动等待操作结果。仓库还提供一组 skills，教 agent 使用 MCP/CLI、做可访问性审计、Cookie/会话调试、LCP 优化、内存泄漏排查和连接故障排查。

## 具体做法
前提：Node.js LTS、Chrome 当前稳定版或更新、npm；有一个支持 MCP 的客户端。以下命令/配置均来自 README。

1. 在 MCP 客户端加入 server 配置。前提：客户端支持 MCP server 配置。
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```
2. 用首个 prompt 验证连通性。前提：上一步已配置；MCP 客户端会按需启动浏览器。
```
Check the performance of https://developers.chrome.com
```
预期：客户端打开浏览器并录制一次 performance trace。README 说明，只有客户端调用需要浏览器实例的工具时，server 才会自动启动浏览器；单独连接不会启动。
3. 如果不想用 MCP，可安装 CLI 从终端控制浏览器。前提：全局安装 npm 包。
```sh
npm i chrome-devtools-mcp@latest -g
chrome-devtools navigate_page 1 --url "https://developers.chrome.com"
chrome-devtools take_screenshot 1 --filePath screenshot.png
chrome-devtools stop
```
4. 安装 skills，让 agent 知道如何用这些工具。前提：使用支持插件的客户端，或手动复制 skill 目录。
Claude Code：
```
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp@chrome-devtools-plugins
```
Copilot / VS Code：运行 **Chat: Install Plugin From Source**，输入 `ChromeDevTools/chrome-devtools-mcp`。
Gemini CLI：
```sh
gemini extensions install --auto-update https://github.com/ChromeDevTools/chrome-devtools-mcp
```
手动安装示例（Claude Code）：
```sh
npm i chrome-devtools-mcp@latest -g
mkdir -p ~/.claude/skills
cp -R "$(npm root -g)/chrome-devtools-mcp/skills/chrome-devtools-cli" ~/.claude/skills/
```
5. 按需关闭数据上报/更新检查。前提：需要隐私或 CI 环境控制。
```json
"args": ["-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"]
```
关闭 CrUX 性能数据请求：启动时加 `--no-performance-crux`。关闭更新检查：设置 `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS`。使用统计在设置 `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS` 或 `CI` 环境变量时也会禁用。
6. 只做基础浏览器任务时，可用 `--slim` 暴露精简工具集；高级连接、并发会话、持久化用户目录、自定义浏览器路径、连接已运行 Chrome、Android 调试等见 Advanced Usage Guide（原文摘录未展开具体参数）。

## 对应的研究问题
- **能力发现**：原文明确可交给 agent 的工作包括：打开并检查页面、分析网络请求、截图、读取 console 消息和 source-mapped stack traces、录制性能 trace 并提取性能洞察、执行浏览器自动化并等待操作结果。这些都是“前端调试与页面验证”类工作，不只是写代码。
- **任务匹配**：适合 Web/前端开发中的调试、性能分析、可访问性审计、Cookie/会话调试、LCP 优化和内存泄漏排查；工具形态是 MCP server 或 CLI，配合支持 MCP 的编码客户端（Antigravity、Claude、Cursor、Copilot 等）。CLI 适合终端/脚本化使用，MCP 适合让 agent 在对话中按需调用。原文没有指定具体模型。
- **条件供给**：需要 Node.js LTS、Chrome 稳定版或更新、npm；需要 MCP 客户端配置或全局安装 CLI；需要允许 agent 控制浏览器实例，这意味着浏览器内容会暴露给 MCP 客户端；官方只支持 Chrome 和 Chrome for Testing；性能工具可能向 Google CrUX API 发送 trace URL；使用统计默认开启。反馈来源是 console、网络请求、截图、trace 和 skills 中定义的检查流程。
- **主动推进**：原文没有给出由时间、事件或状态触发的持续任务编排；只说明 MCP server 在客户端调用需要浏览器实例的工具时自动启动浏览器，以及 puppeteer 自动等待操作结果。不能据此认定它能自主定时巡检或持续监控。
- **效果验证**：原文提供的是验证手段而非验证结论：performance trace 与性能洞察、console 错误（含 source map）、网络请求、截图、可访问性审计、LCP 调试、内存泄漏排查。没有给出量化指标、基准分数或前后对比数据。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）和 Cursor（tool，watch）。该工具不是替代两者，而是作为 MCP server/CLI 给这些编码智能体增加浏览器控制与 DevTools 检查能力；README 明确列出 Claude、Cursor、Copilot 等客户端，并给出 Claude Code 的插件安装命令。Cursor 的具体接入需看 Client Configurations Guide，原文摘录未展开。对已有“编码智能体”是能力扩展：把前端调试、页面检查、性能 trace 变成 agent 可调用工具。

## 证据与局限
- 证据：README 给出可复制配置、首个验证 prompt、CLI 命令、skills 列表和插件安装命令；仓库指标为 stars 55,654、stars_today 67（只是热度信号，不是效果证据）。原文没有 benchmark、案例数据或前后对比。
- 作者主张：“reliable automation, in-depth debugging, and performance analysis”是功能宣称，未给量化验证。
- 限制：官方只支持 Google Chrome 和 Chrome for Testing，其他 Chromium 不保证；MCP server 会把浏览器实例内容暴露给 MCP 客户端，可能检查、调试、修改浏览器或 DevTools 中的数据，应避免共享敏感或个人信息；性能工具可能把 trace URL 发给 Google CrUX API；使用统计默认开启；需要 Node LTS、Chrome stable+、npm；skills 要与 server/CLI 版本同步更新；原文摘录未给出完整工具参考和客户端配置细节。

## 怎么试、怎么验证
最小试用：
1. 选一个非敏感页面的前端改动（或示例页），在 MCP 客户端配置 server。
2. 用首个 prompt 录一次改动前 performance trace，记录 agent 返回的性能洞察。
3. 让 agent 打开目标页，检查 console 消息、网络请求并截图；记录错误、失败请求和视觉异常。
4. 做一个小改动，再重复同样检查；对比 trace 洞察、console 错误、失败请求、截图和可访问性审计结果（如使用 a11y skill）。
5. 如果做 LCP 或内存泄漏，按对应 skill 的流程走，并在相同页面与操作路径上前后对比。
判断改善的指标（基于原文能力，不设原文没有的阈值）：agent 是否能自主发现并定位 console 错误（含 source map 栈）；是否能发现失败/异常网络请求；是否能从 trace 提取可执行性能洞察；截图是否显示目标视觉变化；可访问性审计问题是否减少；LCP 调试前后同一页面的 LCP 指标是否改善；内存泄漏排查是否定位到泄漏点。若 agent 无法稳定复现或需要频繁人工接管，则只保留为辅助调试，不进入主流程。
