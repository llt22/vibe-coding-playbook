# AkaraChen/cc-remote

- 结论：**值得一试**。可以在有一台常开服务器（已登录 claude）的前提下，按 README 的步骤搭一套 cc-remote 做小范围试用，把"模型/会话在远端、文件与 shell 在本机"当作一条可复用的部署与权限边界模板；但它有明确的已知限制（.claude/ 不下发、checkpoint/rewind 失效、LSP/worktree 关闭），不建议直接全面替换本地 Claude Code。
- 原文：https://github.com/AkaraChen/cc-remote
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-07T07:30:12.154Z

## 是什么

cc-remote 是把 Claude Code 包装成 ACP agent 的一个中间层：`claude` 进程跑在远程服务器上（通过 `ssh -T` 启动），而所有内置工具（Read / Write / Edit / NotebookEdit / Bash（Windows 上为 PowerShell）/ Glob / Grep）实际在你本机、会话目录下执行。

分工表（原文）：

| 在本机运行 | 在服务器运行 |
|---|---|
| Read、Write、Edit、NotebookEdit、Bash（Windows 为 PowerShell）、Glob、Grep | 模型、system prompt、会话 |
| ACP 客户端带来的 MCP servers、以及本地 Claude Code 配置里的 MCP servers | Web search、subagents、skills |
| 你的 `CLAUDE.md`、git status、环境变量 | 服务器自己的设置与 MCP servers |

实现方式：claude-agent-acp 用 SDK 通过 stdin/stdout 与 `claude` 通信，cc-remote 把这根流改走 ssh；服务器端关掉内置文件/shell 工具，用同名同入参的本地版本替代，`claude` 通过 SDK 的 tool channel 调用它们（和调 in-process MCP 工具一样）；流上有个代理把工具名改回内置名并做路径映射，客户端才能正常渲染 diff 和终端。对 claude-agent-acp 只打了一处 patch（`patches/`，一个改写 `query()` options 的 hook）。

它的真正价值不在"跑 Claude"，而在于给出了一套**能力边界切分**的具体做法：哪些东西可以放到远端（推理、会话、搜索、子代理），哪些必须留在手里（文件、shell、密钥、本地 MCP）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提 A：SSH 免密可用。** `ssh devbox` 能无密码登录（用 key，端口/用户/跳板机写进 `~/.ssh/config`）。
**前提 B：服务器上的 `claude` 已登录。** Claude Code 2.1.248 或更高，POSIX login shell。先在服务器上跑一次 `claude` 登录，或装好后用 `cc-remote --cli auth login`。
**前提 C：本机装了 Bun**（只为构建；产出的二进制无依赖）。服务器上除 `claude` 外什么都不装；本机不需要装 `claude`。

1. 克隆并构建（本机执行）：

```sh
git clone https://github.com/AkaraChen/cc-remote && cd cc-remote
bun install
bun run compile    # builds the binary for this machine into dist/cc-remote
bun link           # puts cc-remote on your PATH, in ~/.bun/bin
```

   要一次构建全平台（linux-x64、linux-arm64、darwin-arm64、windows-x64、windows-arm64）：`bun run build`，产物落在 `dist/`。

2. 写 host 配置并自检（host 查找顺序：`--host` → `$CC_REMOTE_HOST` → `~/.config/cc-remote/host`；host 可以是任何 `ssh` 接受的值，端口/key/跳板机放 `~/.ssh/config`）：

```sh
mkdir -p ~/.config/cc-remote && echo devbox > ~/.config/cc-remote/host
cc-remote doctor
```

   `doctor` 会检查 ssh 与远端 `claude` 版本——这一步通过再往下走，否则后面全是黑盒排错。

3. 需要自定义 ssh 命令时（语义同 rsync 的 `RSYNC_RSH`）：

```sh
export CC_REMOTE_SSH="ssh -p 2222 -i ~/.ssh/devbox"
```

4. 服务器还没登录过时：`cc-remote --cli auth login`。

5. 在 ACP 客户端里注册 agent，命令为 `cc-remote --host devbox`（写过 host 文件后可直接 `cc-remote`）。

   Zed，`settings.json`：

```json
"agent_servers": {
  "Claude (devbox)": { "command": "cc-remote", "args": ["--host", "devbox"] }
}
```

   paseo，`~/.paseo/config.json` 的 `agents.providers` 下：

```json
"claude-devbox": {
  "extends": "acp",
  "label": "Claude (devbox)",
  "command": ["cc-remote", "--host", "devbox"]
}
```

   或改用插件（带 host / ssh 命令 / 可执行路径的设置界面，"Check" 按钮即执行 `cc-remote doctor`）：

```sh
paseo plugin install github:AkaraChen/cc-remote:paseo-plugin
```

6. 命令清单：

```
cc-remote [--host <host>]                  speak ACP on stdio (what your client runs)
cc-remote [--host <host>] doctor           check ssh and the remote claude version
cc-remote [--host <host>] --cli <args...>  run `claude <args...>` on the server
cc-remote --version | --help
```

7. 按原文的权限模型配置团队习惯（这是最值得抄的部分）：
   - 权限请求转发给你的客户端（与任何 ACP agent 相同）；Read、Glob、Grep 从不询问。
   - "Accept edits" 只批准会话目录内的 Write、Edit、NotebookEdit。
   - Bash 询问时，批准的是**命令前缀**（如 `npm test:*`），不是整个 Bash；Windows 的 PowerShell 同理。
   - 含 `;`、`&`、`|`、重定向、`$(…)`、反引号或换行的命令**永不自动批准**。
   - 前缀批准持续到 cc-remote 退出为止——长会话里等于权限只增不减，需要主动重启。

8. MCP 的接法：除客户端传入的 server 外，cc-remote 还会启动你本地 Claude Code 会启动的那些（`~/.claude.json` 的 user servers、为该目录添加的 servers、项目 `.mcp.json` 中已批准的 servers，批准记录在 `~/.claude/settings.json`、`.claude/settings.local.json` 或本地 `claude` 里）。这些都在本机运行。重名时优先级：客户端 > 本地配置 > 服务器上同名 server。需要 OAuth 的 http/sse server 会先提供一个 `authenticate` 工具，调用后在本机浏览器打开登录页、在 `localhost` 接收回调，token 存在 `~/.config/cc-remote/mcp-auth/`（与 Claude Code 的分开）。

9. ssh 连接参数（默认已给，按需覆盖）：所有会话共享一条连接（`ControlMaster`，保持 10 分钟）；每条连接带 `ServerAliveInterval=15`、`ServerAliveCountMax=3`，断链约一分钟失败而不是挂死。若 `CC_REMOTE_SSH` 里更早出现同名 `-o`，以它为准。Windows 的 OpenSSH 不能共享连接，每个会话各开一条。

10. 会话与工作目录：每个会话镜像到本机 `~/.claude/projects/`（与本地 Claude Code 同位置），客户端可列表、重放、加载、fork；resume 服务器没见过的会话（如 fork）时 cc-remote 会先拷到服务器。服务器上每个本地目录对应一个空工作夹 `~/.cc-remote/ws/<your hostname>/<local path>/`（Windows 上 `C:\Users\me\app` → `~/.cc-remote/ws/<your hostname>/C/Users/me/app/`）。

11. Windows 补充：shell 工具是 PowerShell（PATH 上有 `pwsh` 用 PowerShell 7，否则 5.1）；Grep 需要 PATH 上有 ripgrep（`rg`）。

12. 自建/改代码时的开发回路：

```sh
bun install
bun test
bun src/main.ts --host devbox     # speaks ACP on stdio
bun run compile                   # dist/cc-remote, for this machine
bun run build                     # dist/cc-remote-{linux-x64,linux-arm64,darwin-arm64,windows-x64,windows-arm64}
```

   `test/e2e/` 里有最小 ACP 客户端和一个 fake ssh，用独立的 `HOME` 在本机模拟"远端"，用法见 `test/e2e/client.ts` 头部注释——这是不碰真实服务器就能验证改动的方式。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：** 原文明确切了一刀——把 Web search、subagents、skills、system prompt、会话放在服务器；把文件与 shell 留本机。这提示一类"还没想到交给 AI"的工作：**在你不愿或不能给它 shell 的机器上，仍然可以让它读、改、跑测试**，因为工具执行点被搬到了你信任的一端。反过来，**远端机器的文件系统不必向模型暴露**，模型只在会话目录语义下工作。

**2. 任务匹配：** 适合"本机有代码和环境、但想统一用某台服务器上的模型/订阅/会话记录"的场景；客户端侧明确支持 Zed 与 paseo（任何 ACP 客户端都行）。不适配的：依赖 LSP、Monitor、worktree 工具的工作流（原文写明被关闭）。

**3. 条件供给：** 原文给得最实。需要的输入/权限：SSH 免密（key + `~/.ssh/config` 里配好端口/用户/跳板机）、服务器上已登录的 `claude` 2.1.248+、本机 Bun（仅构建）、host 写在 `~/.config/cc-remote/host` 或 `--host`/`$CC_REMOTE_HOST`、自定义 ssh 用 `CC_REMOTE_SSH`。需要的上下文：本机 `CLAUDE.md`、git status、环境；本地 MCP（`~/.claude.json`、`.mcp.json`）与 OAuth token 目录。反馈面：权限提示按命令前缀而非整类工具、危险 shell 语法永不自动放行、`doctor` 做连通性/版本反馈。

**4. 主动推进：** 原文没有时间/事件/状态触发、定时或后台持续执行的机制；会话 resume/fork 只解决"接着上次"，不是自动推进。这一条无依据。

**5. 效果验证：** 原文只提供两类可操作的检查：`cc-remote doctor`（检查 ssh 与远端 claude 版本）和 `test/e2e/`（最小 ACP 客户端 + fake ssh，独立 HOME 下在本机跑"远端"侧）。没有任何关于任务质量、延迟或成本的量化数据。

## 与已有做法的关系

- **Claude Code（adopt）：** cc-remote 不替代它，而是把同一个 `claude` 二进制当作远端推理端复用；服务器上必须装且登录（2.1.248+）。本机反而**不需要**装 `claude`。所以它更像是给已有的 Claude Code 加一种"分离部署"形态：模型侧沿用 Claude Code 的 settings/skills/MCP（服务器用户级），但项目级 `.claude/`（commands、skills、agents、settings）**不会**下发到服务器。
- **Paseo（adopt）：** 直接支持——可以编辑 `~/.paseo/config.json` 的 `agents.providers`，也可以 `paseo plugin install github:AkaraChen/cc-remote:paseo-plugin` 装插件，插件里带 host / ssh 命令 / 可执行路径设置页和"Check"按钮（等价 `cc-remote doctor`）。
- 上游是 `claude-agent-acp`，cc-remote = 它 + 一处 patch（改写 `query()` options 的 hook），因此"会话、权限提示、模式、模型、fork、diff 都和 claude-agent-acp 一致"。

## 证据与局限

**原文给出的可核对内容：** 完整的安装/配置/命令流程；权限模型的具体规则（哪些工具不问、前缀批准、哪些 shell 语法永不自动批准、批准有效期）；ssh 参数（ControlMaster 10 分钟、ServerAliveInterval=15、CountMax=3、约一分钟失败）；目录映射规则；MCP 优先级与 OAuth token 路径；`test/e2e/` 的 fake ssh 测试方式；PLAN.md 指向完整设计。仓库 150 stars。

**只是作者主张、无数据支撑的：** "和本地 Claude Code 行为一致"、"客户端能照常渲染 diff 和终端"这类表述，原文没有测试数据、延迟对比、失败率或安全评估。Windows 上 OpenSSH 不能共享连接因而每会话各开一条，作者只陈述事实，未说明对并发的影响。

**原文自述的硬限制（必须当作适用条件）：**
- 项目的 `.claude/`（commands、skills、agents、settings）**不下发**到服务器；服务器的用户级 settings、skills、MCP 仍然生效。
- 文件 checkpoint 和 rewind 记录在**服务器**上，看不到你的本地编辑——意味着回滚能力在这个架构下基本失效，这是一个真实的功能缺口。
- 客户端桥接过来的 MCP server 只暴露 tools，不含 resources 与 prompts。
- LSP、Monitor、worktree 工具被关闭。

**其他条件：** 依赖一条稳定的 SSH 长连接；服务器需要 POSIX login shell；Windows 端需要 OpenSSH 客户端（Win10+ 自带）与 `rg`。所有结论仅来自 README，未见任何 issue、benchmark 或第三方复现。

## 怎么试、怎么验证

**最小试用（半天）：**
1. 在一台测试服务器上按前提 A/B 准备好 ssh 免密和已登录的 `claude`；本机 `bun install && bun run compile && bun link`。
2. `echo devbox > ~/.config/cc-remote/host` 后跑 `cc-remote doctor`，把它当作准入门槛，不通过就不继续。
3. 选一个**可丢弃的 scratch 仓库**（不要用主仓库），在 Zed 或 paseo 里注册 `cc-remote --host devbox`，跑一个包含"改一个文件 + 跑一次测试"的小任务。
4. 同时开一个本地 Claude Code 做对照，同一个任务各跑一遍（各 2–3 次）。

**判断有没有改善的指标：**
- **执行点正确性（硬性）：** 改动是否真的落在本机文件上；服务器 `~/.cc-remote/ws/...` 下是否如预期只有空工作夹；`~/.claude/projects/` 里能否列出、重放、fork 该会话。
- **权限行为（安全）：** 构造含 `;`、`|`、`$(…)`、反引号的命令，确认**没有**被自动批准；确认 Bash 批准是前缀级而非整类；确认"Accept edits"只覆盖会话目录内。
- **连通性体验：** 拔网线/断 VPN 后是否约一分钟内失败而不是挂死；连续多次 Bash 调用是否复用同一条连接（观感上延迟是否可接受）。
- **MCP 供给是否等价：** 本地 `~/.claude.json` 里的 server 在会话中是否可用；重名时是否符合"客户端 > 本地配置 > 服务器"的优先级；需要 OAuth 的 server 走 `authenticate` 是否能完成回调并把 token 落到 `~/.config/cc-remote/mcp-auth/`。
- **与本地同任务的差距：** 任务完成率、需要人工纠正的次数、总体耗时。若差距明显或频繁因 checkpoint/LSP/worktree 缺失而返工，就退回本地 Claude Code，只把"工具留本机、模型在远端"当作设计思路借鉴（study 级别），而不是继续用这个工具。
- **回归保护：** 若打算自行改动，先用 `test/e2e/`（fake ssh + 独立 HOME）跑通，再上真机；`bun test` 作为提交前门槛。
