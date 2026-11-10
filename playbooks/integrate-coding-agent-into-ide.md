# 在 Xcode 里用自有密钥和 MCP 跑编码 agent，同时隔离全局配置

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决 Xcode 从 GUI 启动 Claude Code 时拿不到 shell 里的密钥和网关地址、又会把全局 ~/.claude/settings.json 一并用上的问题，让 IDE 内的 agent 走团队网关、带上自己的 MCP 工具稳定工作。
> 先试这一步：先在一台 macOS + Xcode 27 的开发机上运行 ./setup.sh，拿到 claude-acp.sh 路径，用测试密钥只配一个本地 MCP server，在 Xcode 添加 agent 后做一个低风险小任务，并检查 .runtime/agent.log。
> 最近修订：2026-11-11

## 解决什么问题

在 Xcode 里用 Claude Code 时，从 GUI 启动的 agent 拿不到 shell 里的 API key 和网关地址；适配器又硬编码 `--setting-sources user,project,local`，会把全局 `~/.claude/settings.json` 也应用到 Xcode。结果是：IDE 内的行为和终端里的 Claude Code 不一致，密钥要么塞进各种临时办法、要么散落多处。

这篇手册给出一套可照做的做法：把密钥、网关、模型和 MCP 工具集中写进一个权限受控的 `config.json`，在 Xcode 里添加 agent 后小范围试用，再用日志和前后对比确认它确实在工作。

## 适用与不适用

适用：

- macOS 开发机，Xcode 27，且 Settings › Intelligence › Add an Agent 提供 ACP agent 入口。
- 有 Anthropic API key，或有一个兼容网关（根地址加 `auth_token` 或 `api_key`）。
- 想在 Xcode GUI 内以对话方式使用 Claude Code，并把自定义 MCP servers 接进会话。
- 希望 IDE 内的 agent 不读全局设置，或需要显式打开全局设置。

不适用：

- 非 macOS，或 Xcode 版本没有这个 ACP agent 入口。
- 没有自有 key / 网关，只是想直接用官方客户端。
- 需要 agent 到点自动触发、按事件持续干活。原文只说明 agent 由 Xcode 启动、适配器长驻、会话内 `claude` 进程常驻，没有给出由时间、事件或状态触发并持续完成工作的机制，不能据此认为它具备自主推进能力。
- 需要现成的效果数据或兼容性结论。原文没有提供性能数据、用户案例或兼容性测试。

## 前置条件

- macOS 开发机，Xcode 27，菜单里能看到 Settings › Intelligence › Add an Agent…。
- Anthropic API key，或兼容网关的根地址（注意 `base_url` 是网关根地址，不带 `/v1/messages`）加 `auth_token` / `api_key`。
- 能 `git clone` 该仓库。`setup.sh` 会安装 node、claude 和适配器，然后打印 Xcode 要用的路径；原文没有展开 `setup.sh` 的内部步骤，不要假设它做了额外配置。
- 本地 MCP server 准备好绝对路径；远程 MCP server 准备好 URL 和 headers。

## 操作步骤

先选接入方式：只有官方 key 时用做法 A（只填 `api_key`）；团队统一走网关时用做法 B（填 `base_url` 加 `auth_token` 或 `api_key`）。两种做法只影响第 4 步填写 `config.json` 的方式，其余步骤相同。

1. 克隆并运行安装脚本。前提：已确认 Xcode 有 Add an Agent 入口。

```sh
git clone https://github.com/yusuke-114/claude-xcode-agent.git && cd claude-xcode-agent
./setup.sh        # installs node, claude and the adapter, then prints the path for Xcode
```

预期结果：脚本安装 node、claude 和适配器，并打印 `claude-acp.sh` 的路径，把这个路径记下来。

2. 创建并收紧配置文件（可选，但只要你用自己的 key / gateway / model / MCP servers 就需要）。前提：第 1 步已完成。

```sh
cp config.example.json config.json && chmod 600 config.json
```

预期结果：得到一份只有自己能读的 `config.json`，后续所有敏感配置都写在这里。

3. 在 Xcode 里添加 agent。打开 Xcode › Settings › Intelligence › Add an Agent…，把 **Executable** 设为第 1 步打印的 `claude-acp.sh` 路径。

预期结果：Xcode 能把这个脚本作为 ACP agent 启动。

4. 按端点类型填写 `config.json`。

| Endpoint | Fields |
|---|---|
| Anthropic API（做法 A） | `api_key` |
| Gateway, Bearer auth（做法 B） | `base_url` + `auth_token` |
| Gateway, `x-api-key` auth（做法 B） | `base_url` + `api_key` |

示例：

```json
{
  "base_url": "https://your-gateway.example.com",
  "auth_token": "your-token"
}
```

预期结果：会话请求走你指定的端点。填完如果没生效，见第 8 步。

5. 设置默认模型，必要时做别名映射。`model` 会设置 `ANTHROPIC_MODEL`，可以写完整 ID，也可以写 `opus` 这类别名。如果网关的模型命名不同，用 `env` 映射别名：

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

预期结果：会话使用你指定的模型；网关上的模型名通过别名正确对应上。

6. 追加自定义 MCP servers。`mcp_servers` 使用与 Claude Code 的 `mcpServers` 相同的格式，会与 Xcode 自带的 servers 并列，每个 key 是自选名称；本地 server 以进程启动，远程 server 走 HTTP：

```json
{
  "mcp_servers": {
    "my-local-server": { "command": "/absolute/path/to/server", "args": ["--stdio"], "env": { "TOKEN": "..." } },
    "my-remote-server": { "type": "http", "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer ..." } }
  }
}
```

前提：本地 server 必须写绝对路径，因为 Xcode 不会用你的 shell PATH 启动 agent。

预期结果：每个会话加载的 server 名会写入 `.runtime/agent.log`，可据此确认加载成功。

7. 决定是否加载全局设置，并把环境变量补齐。

- `setting_sources` 默认 `project,local`；设为 `user,project,local` 才会加载 `~/.claude/settings.json`。想让 IDE 内与终端行为一致时才打开。
- `env` 原样传给 `claude`，用于 `HTTPS_PROXY` 这类上面字段覆盖不到的变量。Xcode 不继承 shell env，所需环境变量必须写在这里。
- `base_url`、`auth_token`、`api_key`、`model` 已转成 `ANTHROPIC_*` 变量，不要在 `env` 里重复。

预期结果：默认情况下 IDE 内的 agent 读不到全局设置；代理等变量在会话中生效。

8. 改动后重启 Xcode，并查看日志。脚本会在每次 Xcode 启动 agent 时读取 `config.json`；修改后如果没生效，重启 Xcode。日志在 `.runtime/agent.log`。

预期结果：日志里能看到 agent 启动记录，以及每个会话加载的 MCP server 名。

## 怎么判断变好了

最小试用方式：在一台 macOS + Xcode 27 开发机上，用测试用 API key 或测试网关写 `config.json`，只加一个本地 stdio MCP server，在 Xcode 添加 agent，打开一个小型 iOS/macOS 项目，让 agent 完成一个低风险、可核对的小任务（例如解释一个源文件，或生成一个单元测试草稿）。

可观察的指标：

- 能否在 Xcode 内稳定启动并完成一次会话。
- 自定义 MCP 工具是否在会话中可用（对照 `.runtime/agent.log` 中该 server 名是否出现）。
- 请求是否确实走了你指定的网关。
- 是否没有加载全局 `~/.claude/settings.json`：在全局设置里放一个可识别的差异配置，看它是否出现在 IDE 会话里。
- 同一个小任务相比在终端里直接用 Claude Code，交互轮次和人工切换窗口的次数是否减少。
- 密钥是否只存在于权限受控的 `config.json` 中，且没有出现在日志里。

原文没有给出基线数字，也没有给出建议的试用时长，以上指标需要在试用前后自己记录对比，观察窗口按团队节奏自行设定。

## 常见坑

- 不要假设 `setup.sh` 做了额外配置，原文没有展开它的内部步骤。
- `base_url` 填成带 `/v1/messages` 的完整端点会不对，它要的是网关根地址。
- 本地 MCP server 用相对路径或依赖 shell PATH，会找不到；要写绝对路径。
- 以为 Xcode 会继承 shell 环境变量，导致密钥和代理没生效；它们必须写进 `config.json` 的 `env`。
- 在 `env` 里重复写 `base_url`、`auth_token`、`api_key`、`model`，这些已经转成 `ANTHROPIC_*` 变量。
- 默认不读全局设置，所以 IDE 内与终端里的 Claude Code 行为可能不一致；需要一致就改 `setting_sources`。
- `config.json` 含密钥：记得 `chmod 600`，并注意不要把日志和配置提交进仓库。
- 改完配置没重启 Xcode，以为没生效。
- Xcode 版本或适配器行为变化可能影响可用性，原文没有兼容性验证。
- 别指望它自主推进任务，原文没有这类触发机制。

## 证据与来源

- 依据调研：yusuke-114/claude-xcode-agent 的调研报告（基于其 README）。报告给出的证据包括：架构图与两段式 `exec` 设计说明（agent 角色载入 `config.json` 并把 `CLAUDE_CODE_EXECUTABLE` 指向自己后 exec 适配器；claude 角色把 `--setting-sources` 换成 `project,local`、追加 MCP servers 后 exec 真正的 `claude`）；完整安装命令；`config.json` 字段表与多个 JSON 示例；端点认证组合表；日志路径 `.runtime/agent.log`；MIT 许可证；仓库 30 stars。本手册的安装、配置与日志步骤均来自这些内容。
- 属于作者主张、没有效果数据支撑的部分：用包装脚本解决“GUI 启动没有 shell 环境”和“适配器硬编码 `--setting-sources` 导致全局设置被应用”这两个问题的设计，以及“这样接入更合适”的判断。原文没有性能数据、用户案例或效果对比。
- 原文明确没有提供的内容：效果指标与验证方法、建议试用时长、自主推进机制、兼容性测试。本手册“怎么判断变好了”中的指标，是基于原文可观察项（能否启动、MCP 是否加载、日志、密钥位置、设置隔离）整理的，基线需要自己记录。

## 依据的调研

- [yusuke-114/claude-xcode-agent](../research/radar/2026-11-11/12287-yusuke-114-claude-xcode-agent.md)：值得一试，如果团队在 macOS/Xcode 27 上开发，并希望把 Claude Code 以自有 API key/网关和自定义 MCP 接入 Xcode，可按 README 的 setup + config.json + Xcode Add an Agent 流程小范围试用；理由是原文给出了可照做的安装、配置和排障步骤，但缺少效果数据与兼容性验证。
