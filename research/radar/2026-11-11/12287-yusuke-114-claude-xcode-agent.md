# yusuke-114/claude-xcode-agent

- 结论：**值得一试**。如果团队在 macOS/Xcode 27 上开发，并希望把 Claude Code 以自有 API key/网关和自定义 MCP 接入 Xcode，可按 README 的 setup + config.json + Xcode Add an Agent 流程小范围试用；理由是原文给出了可照做的安装、配置和排障步骤，但缺少效果数据与兼容性验证。
- 原文：https://github.com/yusuke-114/claude-xcode-agent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T16:27:02.738Z

## 是什么
`claude-xcode-agent` 是一个把 Claude Code 接入 Xcode 27 的 ACP agent 的包装脚本项目。Xcode 通过 ACP 与 agent 通信，`claude-agent-acp` 适配器把 ACP 桥接到 Claude Code；`claude-acp.sh` 在适配器外再包一层，解决两个问题：Xcode 从 GUI 启动 agent 时没有 shell 环境来放 key/gateway URL；适配器硬编码 `--setting-sources user,project,local`，会把全局 `~/.claude/settings.json` 也应用到 Xcode。脚本以两个角色运行：作为 agent 时把 `config.json` 载入环境、把 `CLAUDE_CODE_EXECUTABLE` 指向自己并 exec 适配器；作为 claude 时把 `--setting-sources` 换成 `project,local`、追加 MCP servers 并 exec 真正的 `claude`。两步都用 exec，不留下包装进程，stdout 保持纯 ACP。

## 具体做法
1. 前提：macOS，Xcode 27 且提供 Settings › Intelligence › Add an Agent 的 ACP agent 入口；准备 Anthropic API key 或兼容网关。仓库中的 `setup.sh` 会安装 node、claude 和适配器，并打印 Xcode 要用的路径；原文没有展开 `setup.sh` 的内部步骤，不要假设它做了额外配置。
2. 克隆并运行安装脚本：
```sh
git clone https://github.com/yusuke-114/claude-xcode-agent.git && cd claude-xcode-agent
./setup.sh        # installs node, claude and the adapter, then prints the path for Xcode
```
记录脚本打印的 `claude-acp.sh` 路径。
3. 可选：要使用自己的 key / gateway / model / MCP servers 时，创建配置文件并收紧权限：
```sh
cp config.example.json config.json && chmod 600 config.json
```
4. 在 Xcode › Settings › Intelligence › Add an Agent… 中，把 **Executable** 设为上一步打印的 `claude-acp.sh` 路径。
5. 按端点类型填写 `config.json`。`base_url` 是网关根地址，不带 `/v1/messages`：

| Endpoint | Fields |
|---|---|
| Anthropic API | `api_key` |
| Gateway, Bearer auth | `base_url` + `auth_token` |
| Gateway, `x-api-key` auth | `base_url` + `api_key` |

示例：
```json
{
  "base_url": "https://your-gateway.example.com",
  "auth_token": "your-token"
}
```
6. 设置默认模型：`model` 会设置 `ANTHROPIC_MODEL`，可用完整 ID 或 `opus` 这类别名。如果网关的模型命名不同，用 `env` 映射别名：
```json
{
  "model": "opus",
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "your-gateway-opus-id",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "your-gateway-sonnet-id",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "your-gateway-haiku-id"
  }
}
```
7. 追加 MCP servers。`mcp_servers` 使用与 Claude Code 的 `mcpServers` 相同的格式，会与 Xcode 自带的 servers 并列；每个 key 是自选名称。本地 server 以进程启动，远程 server 走 HTTP：
```json
{
  "mcp_servers": {
    "my-local-server": { "command": "/absolute/path/to/server", "args": ["--stdio"], "env": { "TOKEN": "..." } },
    "my-remote-server": { "type": "http", "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer ..." } }
  }
}
```
本地 server 要用绝对路径，因为 Xcode 不会用你的 shell PATH 启动 agent。每个会话加载的 server 名会写入 `.runtime/agent.log`。
8. 其他字段：`setting_sources` 默认 `project,local`；设为 `user,project,local` 才会加载 `~/.claude/settings.json`。`env` 原样传给 `claude`，用于 `HTTPS_PROXY` 等上面字段覆盖不到的变量；`base_url`、`auth_token`、`api_key`、`model` 已转成 `ANTHROPIC_*` 变量，不要在这里重复。Xcode 不继承 shell env，所以所需环境变量要写在这里。
9. 配置读取时机：脚本在每次 Xcode 启动 agent 时读取 `config.json`；修改后如果没生效，重启 Xcode。日志在 `.runtime/agent.log`。

## 对应的研究问题
- 能力发现：原文说明可以把自定义 MCP servers 加到 Xcode 的 agent 会话中，从而把外部工具接入 Xcode 内的 Claude Code；但没有列出具体任务类型或“还没想到交给 AI 的工作”清单。依据仅限 MCP 接入能力。
- 任务匹配：适合在 macOS/iOS 开发中，从 Xcode GUI 内以对话方式使用 Claude Code；架构上 Xcode 启动一次 agent，适配器长驻，每个会话启动一个 `claude` 进程，会话内消息直接发给运行中的 `claude`。模型可通过 `model` 指定，网关模型名不同时用 `env` 做别名映射。
- 条件供给：需要提供 API key，或网关 `base_url` 加 `auth_token`/`api_key`；需要时会提供 `model`、`mcp_servers`（本地 server 用绝对路径）和 `env`（如 `HTTPS_PROXY`）。权限方面，`config.json` 建议 `chmod 600`；是否读取全局 `~/.claude/settings.json` 由 `setting_sources` 控制。反馈方面，`.runtime/agent.log` 记录每个会话加载的 server 名。
- 主动推进：原文没有给出由时间、事件或状态触发并持续完成工作的机制；只说明 agent 由 Xcode 启动、适配器长驻、会话内 `claude` 进程常驻。不能据此认为它具备自主推进能力。
- 效果验证：原文没有给效果指标或验证方法；可依据日志确认 agent 启动、会话加载的 MCP server 名称等运行状态，但原文未提供任务质量或效率的度量。

## 与已有做法的关系
清单中有 **Claude Code**（工具，状态 adopt）。本项目不替代 Claude Code，而是给 Claude Code 增加一个 Xcode 侧的 ACP 接入包装：复用 Claude Code 的 `claude` 可执行文件和 MCP 配置格式，额外处理 Xcode GUI 启动时的密钥/网关环境与全局设置隔离。清单中没有 Xcode ACP agent 或 `claude-agent-acp` 适配器的相关条目。

## 证据与局限
原文给出的证据：架构图与两段式 `exec` 设计说明；完整安装命令；`config.json` 的字段表和多个 JSON 示例；端点认证组合表；日志路径；MIT 许可证；仓库 30 stars。原文没有给出性能数据、用户案例、兼容性测试或效果对比，属于作者对两个问题的设计主张。适用条件：Xcode 27 且支持 ACP agent；macOS；需要自备 API key 或网关；本地 MCP server 使用绝对路径；Xcode 不继承 shell 环境，环境变量必须写入 `config.json` 的 `env`。局限：`setup.sh` 的内部行为原文未展开；Xcode 版本或适配器行为变化可能影响可用性；`config.json` 含密钥，需注意权限和日志泄露；默认不读全局设置，可能与终端里 Claude Code 的行为不一致。

## 怎么试、怎么验证
最小试用：在一台 macOS + Xcode 27 开发机上，克隆仓库并运行 `./setup.sh`；先用一个测试用 API key 或测试网关写 `config.json`，只加一个本地 stdio MCP server；在 Xcode 添加 agent，打开一个小型 iOS/macOS 项目，让 agent 完成一个低风险、可核对的小任务（例如解释一个源文件或生成一个单元测试草稿）。检查 `.runtime/agent.log` 是否出现该 server 名，确认请求是否走指定网关，并确认没有加载全局 `~/.claude/settings.json`（可在全局设置里放一个可识别的差异配置来验证）。判断改善的指标：能否在 Xcode 内稳定启动并完成一次会话；自定义 MCP 工具是否在会话中可用；同一小任务相比在终端里直接用 Claude Code，交互轮次和人工切换窗口的次数是否减少；密钥是否只存在于权限受控的 `config.json` 中且未出现在日志。原文未给基线数字，以上指标需自行记录前后对比。
