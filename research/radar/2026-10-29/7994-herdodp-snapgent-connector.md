# herdodp/snapgent-connector

- 结论：**值得一试**。建议小范围试用：在非敏感仓库按 README 加载浏览器扩展并启动本地桥接，让浏览器聊天 AI 经 MCP 操作 VS Code；理由是安装、启动、使用和排障步骤较完整，但项目成熟度、扩展权限与 MCP 写权限需先隔离验证，暂不宜直接全量采用。
- 原文：https://github.com/herdodp/snapgent-connector
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T19:19:43.835Z

## 是什么

snapgentV3 是一个浏览器扩展加本地 bridge，把支持的 AI 聊天网页连接到 VS Code（默认目标）和 MCP 目标。基本链路是：用户在聊天里描述任务，AI 回复 snapgentV3 命令，扩展检测命令并转发给本地 bridge，bridge 路由到 VS Code MCP server，结果回传到聊天继续处理。README 称无需 API key、订阅或登录，并列出 ChatGPT、Claude、Gemini、Kimi、Grok、GLM、Qwen、Arena、Meta AI、Ptero 等支持站点。默认 VS Code MCP server 标注有 24 个 workspace 工具。项目为 GPL-3.0，当前 release 为 V3.3，仓库 53 stars。

## 具体做法

1. **前提检查**：准备 Edge 或 Chrome（Manifest V3）、VS Code、Windows/macOS/Linux 之一；macOS/Linux 需要 Python 3.9+；使用期间 bridge 必须运行；先下载并解压最新 release。前提：浏览器支持 MV3，且你接受把浏览器聊天与本地工作区连接。

2. **加载扩展**：解压 V3.3 release 后，打开 `edge://extensions` 或 `chrome://extensions`，启用 Developer mode，点击 Load unpacked，选择 `snapgent-extension` 文件夹；工具栏出现 snapgentV3 图标。前提：扩展文件夹来自解压后的 release，浏览器允许加载未打包扩展。

3. **设置 MCP 目标**：在 VS Code 中打开要操作的项目文件夹，再在聊天栏点击 Start；bridge 可以先于 VS Code 启动，agent 会等待 workspace 可用，且 README 说明不会回退到 Snapgent release 文件夹。前提：默认目标是 VS Code，且目标项目已在 VS Code 打开。

4. **启动 bridge（按系统选择）**：
   - Windows：双击 `start.bat`。它会自动配置 VS Code MCP，可以在 VS Code 之前启动；机器相关设置写入被忽略的本地 `config.json`。前提：在解压后的 release 文件夹中运行。
   - macOS：双击 `MacOS_Start.command`。它会检测 bundled VS Code MCP server、Roblox Studio 的 MCP executable、已安装的 EffectCraft CLI，并把机器相关路径写入本地 `config.json`；使用 `bridge.py`，不运行 Windows-only 的 `bridge.exe`。前提：Python 3.9+；首次启动可能遇到 Gatekeeper 警告，需要在系统设置中允许；保持终端窗口开启。
   - Linux：在解压后的 release 文件夹打开终端并运行：

```bash
bash Linux_Start.sh
```

   它会检测 bundled VS Code MCP server 和已安装的 EffectCraft CLI，写入本地 `config.json`，使用 `bridge.py`；首次启动会为用户安装 `websockets`，或在发行版阻止用户安装时创建本地 Python 环境。前提：Python 3.9+；保持终端窗口开启。

5. **可选连接 EffectCraft**：Windows 下 `start.bat` 会检测常见安装位置并启动其控制通道；macOS/Linux 需安装 EffectCraft CLI 并把 `effectcraft-cli` 放到 `PATH`，launcher 检测到后会启动控制通道；如果 EffectCraft 已打开但未带控制通道，先保存工作并关闭 EffectCraft 再重启 launcher；连接后在聊天栏的 MCP target selector 选择 EffectCraft。前提：已安装 EffectCraft，且按系统要求配置 CLI。

6. **可选连接 Roblox Studio MCP**：macOS 在 `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP` 检测；如果安装在其他位置，启动前设置 `ZS_STUDIO_MCP_PATH`。Linux 不自动检测 Roblox Studio MCP；如有兼容的 Linux MCP executable，运行 launcher 前把 `ZS_STUDIO_MCP_PATH` 设为它的路径；Roblox Studio 本身在部分 Linux 发行版上可能不可用。前提：对应 MCP executable 存在。

7. **开始会话**：打开支持的 AI 聊天站点并新建聊天；在 VS Code 打开项目文件夹后，在聊天栏点击 Start，然后用自然语言描述任务。README 给出的示例提示词是：

```text
"Inspect the files in my project and explain how the login flow works."
"Add a search bar to the books page and wire it to the existing API."
```

   前提：bridge 窗口保持开启，VS Code 工作区已打开，所用站点在支持列表中。

8. **运行要点与排障**：保持 bridge 窗口开启，关闭会断开 agent；保持目标项目在 VS Code 打开；Arena 使用 Direct 模式；Gemini 或 Kimi 在长会话中停止使用工具时，提醒它使用 snapgentV3 commands 或新建聊天。扩展栏缺失时检查扩展是否启用、当前聊天站点是否允许访问并刷新标签页；bridge offline 时重新启动对应 launcher；AI 不使用工具时提醒或新建聊天；VS Code target 不可用时，从解压后的 release 文件夹运行 `start.bat` 并保持项目在 VS Code 打开。

## 对应的研究问题

- **能力发现**：README 展示了原本只在聊天窗口里的 AI 可以通过扩展和 MCP 检查项目文件、解释登录流程、给页面加搜索栏并接现有 API；默认 VS Code MCP server 标注有 24 个 workspace 工具。这说明可把“聊天模型”扩展到工作区文件阅读和修改类任务，但原文只给了示例，不是完整能力清单。
- **任务匹配**：README 的支持站点表和注意事项可用于匹配模型/站点：ChatGPT、Claude 禁用图片输入和截图；Gemini 长会话可能停止使用工具；Kimi 某些会话可能使用原生工具；Grok 需要登录 xAI；Arena 要用 Direct 模式。默认目标为 VS Code。
- **条件供给**：需要安装浏览器扩展、允许站点访问（README 提到 `manifest.json` 的 `content_scripts` 和 `host_permissions`，以及 `background.js` 的 `PROVIDER_URLS`）、运行本地 bridge、配置 MCP target、在 VS Code 打开工作区，并把执行结果回传到聊天形成反馈。
- **主动推进**：原文没有时间、事件或状态触发的自动任务；会话由用户点击 Start 并发出指令启动，agent loop 会把结果返回聊天并继续处理，但没有定时或事件驱动持续工作的证据。
- **效果验证**：README 提供故障排查，并提到 `test-*.js`、`test_bridge.py`、`test_setup_config.py` 等测试文件，但没有给出任务成功率、时间节省、错误率或基准数据；无法仅凭原文判断效果改善。

## 与已有做法的关系

清单中没有相关条目（`catalog_related` 为空）。README 也没有与清单内任何做法做对比；只能把它视为“浏览器聊天 AI + 本地 MCP bridge + VS Code 工作区”的组合方案。

## 证据与局限

证据主要来自仓库 README：给出了支持的 provider 列表、系统要求、分平台安装步骤、启动方式、使用示例、架构说明、项目结构、排障表和测试文件。仓库显示 53 stars、release V3.3、GPL-3.0。

作者主张包括：无需 API key、订阅或登录；无需终端、无需复制粘贴；“Turn any AI chatbot browser to VS Code”。但实际支持站点是有限列表，且 Linux 步骤需要在终端运行 launcher，各平台也要求保持 bridge 窗口或终端开启，因此“no terminal”不是完全无条件成立。README 还标注了 Gemini/Kimi 长会话可能停止使用工具、ChatGPT/Claude 禁用图片输入和截图、Grok 需要登录等限制。

局限：只有 README，没有独立安全审计、性能基准或用户案例；扩展以 unpacked 方式加载，且涉及浏览器站点权限和本地 MCP 路由，VS Code MCP 可能读写工作区，必须在非敏感项目中验证。README 对 provider 激活只给出文件位置，没有给出可直接复制的完整配置值。没有证据支持定时、事件触发或长期自主推进。

## 怎么试、怎么验证

1. 选择一个非敏感、可丢弃的测试仓库，在 VS Code 打开；按 README 安装扩展并启动对应系统的 bridge，确认 bridge 终端保持开启、VS Code target 可用。
2. 先做基线：用同一个 AI 聊天但不接 connector，手动复制粘贴完成 2 到 3 个边界清楚的任务，例如“检查文件并解释登录流程”和“给页面加搜索栏并接现有 API”；记录耗时、人工复制粘贴/终端步骤数、返工次数。
3. 再接 connector 重复同类任务：点击 Start 后用 README 示例提示词或同义任务描述；每次接受修改前用 `git status` 和 `git diff` 检查改动范围，避免意外写入。
4. 建议记录的指标：任务完成情况（完成/部分/失败）、从开始到首个有用结果的时间、总完成时间、人工复制粘贴和终端步骤数、工具调用失败次数、bridge 断连次数、返工次数、非预期文件改动数；如果测试仓库有测试或构建命令，记录是否通过。
5. 判断改善：与手动基线相比，若完成时间或人工步骤明显减少，且非预期改动和返工没有增加，可认为小范围有效；若出现 bridge 不稳定、AI 不使用工具、权限过大或工作区意外改动，应停止扩大范围，并优先收紧权限和隔离环境。原文没有给出效果数字，以上指标需在试用中自行采集。
