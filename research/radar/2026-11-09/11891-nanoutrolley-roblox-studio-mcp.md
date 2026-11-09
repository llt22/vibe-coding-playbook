# Nanoutrolley/roblox-studio-mcp

- 结论：**不值得跟进**。不要安装或运行：README 的 Quick Start 指向 telegra.ph 短链下载压缩包并执行 ProjectFiles.exe，与该仓库自称的 npx 包安装方式自相矛盾，是典型的投毒式分发；它唯一可借鉴的只是「MCP 暴露运行中软件状态＋只读安全模式」这一设计方向，应从有源码可审计的正规 MCP 服务器去学。
- 原文：https://github.com/Nanoutrolley/roblox-studio-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T14:00:21.377Z

## 是什么

仓库自称是一个 Node.js/TypeScript 写的 MCP（Model Context Protocol）服务器，用来把 Roblox Studio 和 AI 编程助手（Claude Desktop、Cursor、Cline、ChatGPT）桥接起来。README 声称的能力包括：

- 读取 place 的完整对象树（Object Tree Reader）
- 查看并修改实例属性（Property Inspector）
- 由 AI 创建/读取/更新 Lua 脚本（Lua Script Editor）
- 从 agent 侧运行、暂停、停止 playtest
- 只读安全模式（Read-Only Mode）
- 自动发现已打开的 Studio 会话（Auto-Discovery）
- 通信方式为 WebSocket / stdio，默认端口 44755

也就是说，它想干的事是：把一个正在运行的编辑器/软件的「内部状态读取权 + 写操作权 + 运行控制权」通过 MCP 交给模型。

**但必须先说清楚：这份 README 的安装部分高度可疑。** 页面正中是一个指向 `telegra.ph` 短链的「DOWNLOAD CORE UPDATE PACK」按钮，要求下载压缩包、解压、运行 `ProjectFiles.exe`、再「按屏幕提示注入脚本」。这与它自己在下方给出的 `npx roblox-studio-mcp` 安装方式是冲突的两套说法，且「下载 exe 并注入」是恶意软件分发的常见话术。**不要执行该 exe。**

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 下面第 1 步是安全核验，不可跳过；第 2–4 步只有在核验通过后才谈得上执行，否则请直接放弃本仓库。

1. **先做安全核验（前提：还没有下载任何东西）**
   - 到 npm 上查是否存在名为 `roblox-studio-mcp` 的包，核对维护者、发布时间、版本历史是否与 GitHub 仓库对得上；
   - 检查仓库是否有真实源码目录（`src/`、`package.json`）、提交历史、issue、release；
   - 对照 README 的两种安装路径是否一致。**本次材料中两者矛盾，且其中一条要求运行未签名 exe，因此本仓库不应被使用。**
   - 红线：任何要求「下载压缩包 → 运行 exe → 注入脚本」「关闭杀毒软件」「输入账号凭据」的 MCP 服务，一律终止。

2. **（仅在包已核实可信后）客户端配置**：README 给出的配置形式如下，可原样粘贴到 `claude_desktop_config.json` 或 Cursor 的 MCP 设置里，然后重启助手。

```json
{
  "mcpServers": {
    "roblox-studio": {
      "command": "npx",
      "args": ["-y", "roblox-studio-mcp"]
    }
  }
}
```

3. **以只读模式起步**（前提：服务已确认可信）：README 列出的环境变量可用于收紧权限，先只开只读，确认行为符合预期再考虑写入。

```
RBX_MCP_PORT=44755
RBX_MCP_SAFE_MODE=true
RBX_MCP_LOG_LEVEL=debug
RBX_MCP_TIMEOUT=<毫秒>
```

4. **从只读问题开始对话**：README 给的示例提问是：

```
Show me the object tree of my Roblox place
```

前提：你在 Roblox Studio 里对该 place 有编辑权限，并已打开该会话（README 称服务器会自动发现打开的 Studio 会话）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **1 能力发现**：README 声称可交给 AI 的工作是「遍历对象树、检查/修改属性、生成与改写 Lua 脚本、控制 playtest 启停」。这是「把 IDE 里的重复性巡检和样板脚本生产交出去」的一类，但**没有任何使用示例、截图或日志**说明实际效果。
- **2 任务匹配**：只说了需要有支持 MCP 的客户端（Claude Desktop、Cursor、Cline、ChatGPT via adapters），传输用 WebSocket/stdio，服务是本地 Node 进程。没有说明什么任务适合什么模型、上下文怎么给、大对象树如何截断或摘要——这是该方案最关键的匹配问题，原文完全缺失。
- **3 条件供给**：这是全篇信息最实的一块。需要提供的条件包括：对 place 的 edit access（FAQ 明确要求）、一个已打开的 Studio 会话、端口与超时配置、日志级别、以及 `RBX_MCP_SAFE_MODE` 这个权限闸门（只读 vs 可写）。权限分级以「安全模式 + 只读」的方式暴露，是可迁移的做法。
- **4 主动推进**：**无依据**。README 描述的全是请求—响应式的工具调用，没有任何时间触发、事件触发或状态持续轮询的机制；playtest 的启停也是人发起。
- **5 效果验证**：**无依据**。没有任何数据、对照、案例或指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中的 **Cline**（watch）和 **Cursor**（watch）在本方案里是被支持的 MCP 客户端，即本项目若可用，是挂在这两类客户端下面的服务端插件，而不是替代品。

清单中没有与 Roblox Studio、游戏引擎编辑器桥接、或 MCP 服务端实现直接相关的条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **可核实的只有一份 README**：没有源码、没有版本号、没有 issue、没有提交记录、没有 benchmark、没有任何使用案例或前后对比数据。
- 279 stars 是唯一的量化信号，但它衡量的是关注度，不是正确性或安全性，且很容易被刷。
- 「Safe by design: no execution of untrusted code, no memory manipulation」「only interacts with Studio through the official plugin API」均属**作者主张**，无第三方验证，且与页面上要求运行外部 exe 的行为直接矛盾。
- 文中出现「2026」字样、徽章墙、telegra.ph 外链，这些都不是正常开源项目的形态。
- 适用条件（若它是一个真实项目）：使用者需在 Roblox Studio 中拥有该 place 的编辑权限；依赖官方 Studio 插件 API；仅覆盖 Roblox 生态，不能直接迁移到其他软件。
- 结论：**这份材料不足以支撑任何「照做」的步骤**，只能作为「反面样本 + 一个设计方向的提示」。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**不要用本仓库做试用。** 如果要把「MCP 把运行中软件的状态与操作权限交给 agent」这个方向验证下去，最小可行路径是：

1. 换一个**有公开源码、有 release、可审计**的 MCP 服务器（或自己写一个只暴露 1–2 个只读工具的几十行服务），只做「读取当前软件状态」一件事；
2. 以只读模式接入一个客户端（Cursor/Cline/Claude Desktop）；
3. 选一个真实小任务（例如「列出当前场景里所有命名不合规的对象」），对比「AI 通过 MCP 自己读」与「人工导出后粘贴给 AI」两种方式。

判断是否改善的指标（可自建、可量化）：

- 单任务耗时（分钟）；
- 人工复制粘贴/手工导出的次数（应显著下降）；
- AI 首次给出正确结果的比例；
- **误改次数（只读阶段必须为 0）**与回滚次数；
- 上下文 token 消耗（对象树一次全量塞进去是否撑爆上下文，是否需要摘要/分页）。

安全终止条件：一旦某方案要求你运行未签名 exe、关闭安全软件或交出凭据，立即中止评估，并把该方案标记为不可用。
