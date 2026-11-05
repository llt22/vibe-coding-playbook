# JosssphZhou/poki

- 结论：**值得一试**。可以在有备用 iPhone 的 Mac 上按 README 原样跑通 MCP 注册与一个只读任务，测出成功率和人工接管成本后再决定是否进手册；因为安装与注册步骤具体可复制，但项目仅 v0.1.0、强依赖 macOS + 完整 Xcode、真机只在中国区界面验证过，且「越用越快」无数据支撑。
- 原文：https://github.com/JosssphZhou/poki
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T20:19:37.960Z

## 是什么

Poki 是一个开源（AGPL-3.0-only）的本地工具，目标是让 AI 智能体「像你一样用 iPhone」：在 macOS 上起一个原生桥（基于 idevice / idb），通过 USB 或 Wi-Fi 连接真机 iPhone 或模拟器，把点击、输入、读屏等操作暴露成 MCP 工具。它有两种用法：

- **Poki MCP**：把 iPhone 操作能力挂到已有的 MCP 客户端（Claude Code、Codex 或任何支持 `mcpServers` JSON 的客户端）上，沿用你自己的订阅，不需要额外模型账号。
- **Poki Agent**：项目自带的终端 agent，附带 iMessage / Telegram 消息通道，可远程下任务。

README 自述的定位是替代「只能用 API」的自动化：能操作没有开放接口的第三方 App 和网页。当前版本 v0.1.0，126 stars。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 1：核对硬性前提（不满足则整条线索不可用）**

- macOS 15 或更高；预构建包只提供 Apple Silicon（arm64）。
- 完整版 Xcode（不是 Command Line Tools）、Rust、Node.js 24+、ffmpeg；用预构建包时还需要 Python 3。
- 一台 iPhone（真机需先用 USB 与 Mac 配对并开启开发者模式，见 `docs/physical-iphone.md`）。
- 官方说明：`./bin/setup` 会检查缺失依赖；初次编译需要数分钟。

**步骤 2A：源码方式启动服务（在终端 A 中长期运行）**

```sh
git clone https://github.com/JosssphZhou/poki.git
cd poki
./bin/setup
npm start
```

**步骤 2B：或使用预构建 macOS arm64 包（可跳过 Rust 与 `./bin/setup`）**

```sh
tar -xzf poki-v0.1.0-macos-arm64.tar.gz
cd poki-v0.1.0
npm ci --no-audit --no-fund
npm start
```

包内已含原生桥与 idevice 工具；仍需 Apple Silicon 的 macOS、完整 Xcode、Node.js 24+、Python 3 和 ffmpeg。

**步骤 3：把 MCP 服务器注册到你的客户端（另开一个终端，在同一目录下执行）**

```sh
claude mcp add --scope user poki-mcp -- node "$PWD/src/stdio.mjs"   # Claude Code
codex mcp add poki-mcp -- node "$PWD/src/stdio.mjs"                 # Codex
```

前提：终端 A 的 `npm start` 保持运行；`$PWD` 必须是仓库/包目录，否则路径失效。

**步骤 4（可选）：安装独立 Agent，用终端或消息通道下任务**

```sh
npm ci --prefix agent
export PATH="$PWD/bin:$PATH"
poki login
poki status
```

渠道配置完成后再启动：`poki imessage` 或 `poki telegram`（具体配置见 `agent/README.md`，原文未展开）。

**步骤 5：找到设备并跑第一个任务**

```sh
node bin/call.mjs list_devices   # Find your device UUID
poki "Search esp32 in Chrome and summarize the top result"
```

只有一台已连接设备时会自动选中；多设备需加 `--device '<device UUID>'`。

**步骤 6（替代路径）：让 agent 自己完成安装**

把下面这段原样交给 agent：

```text
Install https://github.com/JosssphZhou/poki following its root AGENTS.md, including the MCP skill, and stop whenever you need me to act.
```

注意最后一句是人为介入点设计——安装过程中需要你操作时它会停下来。

**步骤 7：先立安全边界再跑写操作**

原文明确警告：Poki 控制的是真实 iPhone，让它发消息或付款它就会做；屏幕内容会发送到你配置的模型服务；自动化第三方 App/网站可能违反其服务条款，账号受限的后果由使用者承担。因此建议先用只读任务（搜索、读屏、总结）验证，再考虑写操作。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：给出了一类此前较少委托出去的工作——手机 App 的 UI 层操作。README 的示例任务是「在 Chrome 里搜索 esp32 并总结首条结果」，说明可委托对象是「有界面但没有开放 API」的移动端流程（搜索、浏览、站内操作）。原文没有给出更多任务清单。

**2. 任务匹配**：明确支持两种协作形态。一是接入已有 MCP 客户端（Claude Code / Codex / 任何支持 `mcpServers` JSON 的客户端），复用你自己的订阅，不新开模型账户；二是用自带 Agent + iMessage/Telegram 通道远程下达任务。多设备靠 `--device '<UUID>'` 指定。原文没有说明哪类模型或哪类任务更适合，也没有给模型选择建议。

**3. 条件供给**：条件写得很实：macOS 环境与完整工具链（Xcode、Rust、Node 24+、ffmpeg）、真机 USB 配对与开发者模式、MCP 客户端注册命令、屏幕内容回传到模型服务这一数据条件，以及「stop whenever you need me to act」这类人工确认点。原文还提到 Agent 会记住过去的任务、重复执行更快（自学习路由），属于记忆/反馈类条件，但没有给出机制细节。

**4. 主动推进**：可依据的只有「消息通道远程触发」（`poki imessage` / `poki telegram`）和路线图里的常驻连接优化、以及计划中不依赖 Mac 的 iPhone App。按时间/事件/状态自动触发并持续完成的机制，README 中没有具体说明，暂不成立。

**5. 效果验证**：原文只有「Gets faster with use」这一句主张，没有成功率、耗时或对照数据。测试结果与已知限制放在 `docs/verification.md`，但该文件内容不在给出的材料里，无法引用。验证方案需要自己设计（见末节）。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：Poki 直接给出 `claude mcp add --scope user poki-mcp -- node "$PWD/src/stdio.mjs"` 的注册方式，属于在既有 adopt 工具上外挂一个新能力域（真实 iPhone 操作），不是替代品。手册里可以把它写成 Claude Code 的「移动端执行器」扩展条目。
- **Hermes（清单状态 watch）**：原文致谢列表里出现 `hermes-agent`（NousResearch）作为所依赖的开源项目之一，但未说明具体用途和集成方式，只能记录这条技术依赖关系，不能推断更多。

## 证据与局限

**原文给出的可核实内容**：完整的安装/启动/注册命令、依赖清单、两种分发方式（源码与预构建 arm64 包）、一个可直接执行的示例任务、真机配对的前置要求。

**只是作者主张、无数据支撑**： 「Gets faster with use: Poki Agent remembers past tasks and runs them faster on repeat.」没有任何量化。star 数 126、版本 v0.1.0 说明项目处于早期、社区验证有限。

**原文自陈的已知限制（重要，直接决定适用范围）**：

- 真机支持只在中国区界面语言的 iPhone 上验证过；真机仅支持竖屏。
- App 容器导出、跳转到 Settings 子页面的直链不可用。
- 平台限定 macOS（预构建包仅 arm64），且需要完整 Xcode——门槛远高于普通 MCP 工具。
- 需要一台可被自动化支配的实体 iPhone；屏幕内容外发到模型服务，存在数据暴露面。
- 写操作（发消息、付款）会真实发生；第三方 App 自动化可能违反 ToS，账号风险自担。
- AGPL-3.0-only：若把它的代码集成进对外提供的服务，需要考虑开源传染性。

**适用条件**：使用者有 Apple Silicon Mac、愿意装完整 Xcode、有一台可清空的备用 iPhone，且目标任务确实只能走 App 界面（没有 API 或 API 不可用）。不满足这些条件，这条线索只能停留在「知道有这条路」。

## 怎么试、怎么验证

**最小试用（建议 1 天内完成）**

1. 用一台可清空的旧 iPhone 做靶机，USB 配对，避免用主力机（防止误发消息/误付款）。
2. 按步骤 2A/2B + 步骤 3 跑通，注册到 Claude Code。
3. 先只跑只读任务，每类 3 次：(a) 浏览器搜索并总结；(b) 读取某个 App 列表页内容并结构化输出；(c) 一个「没有 API、只能点界面」的真实小任务。
4. 再跑可逆写操作 3 次（例如给自己发一条消息、新建一条备忘），全程盯着屏幕。
5. 每个任务重复第二遍，检验「重复执行更快」是否真实存在。

**判断有没有改善的指标**

- 首次成功率：无人工接管即完成的任务占比。
- 人工接管次数/任务：每次干预记一次，这直接决定它是否比手工做更省。
- 端到端耗时 vs 手工耗时：只有当「人工接管次数 ≈ 0」时，时间节省才有意义。
- 重复任务第二次耗时相对第一次的下降幅度：验证作者「越用越快」的主张。
- 误操作次数（点错、发错对象、误触不可逆按钮），任何一次未经确认的不可逆动作即触发停用并回到沙箱环境。

**结论口径**：若只读任务成功率高、接管少，则可在手册中作为「无 API 移动端流程」的执行方案收录（仍限制在只读或可逆操作）；若接管频繁或需要反复人工纠偏，则降级为 study，只保留「MCP 接真机」这一思路，不推荐具体落地。
