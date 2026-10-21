# migasrias2/geckobox

- 结论：**值得一试**。先在两三台机器上用 `openspaces` 小范围试跑只读诊断任务和单仓库修测试，验证线程恢复、日志、清理与权限行为之后，再扩展到多机并行；理由是 README 给出了可直接复制的安装、沙箱、凭据注入和多机 fan-out 命令与 SDK 片段，但它本身没有调度能力、codex/gemini/opencode 适配器未实机验证、且默认权限策略会自动放行文件编辑，不宜一次性铺开。
- 原文：https://github.com/migasrias2/geckobox
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T11:07:20.065Z

## 是什么

`geckobox` 是一个 MIT 许可的开源项目，CLI 与 SDK 名为 `openspaces`。它把 Claude Code、Codex、Gemini、OpenCode 这类“无头（headless）”编码智能体放到你指定的任意一台计算机上跑，并可以从一个本地面板统一发起、观察和接管任务。

核心抽象只有两个：

- **computer（计算机）**：任何能跑 shell 脚本的东西——`local`、`ssh:user@host`、`container:[user@]name` / `docker:` / `podman:`、`cua:sandbox`。
- **thread（线程）**：一台计算机上的一次智能体会话。每一轮在该机 `~/.openspaces/work/<thread>` 里无头执行，保存 session id，下一条消息恢复同一段对话。线程状态存在发起方机器的 `~/.openspaces/threads/`。目标机上除智能体 CLI 本身外无需安装任何东西：没有守护进程、没有账号、没有中继服务器。

作者对标的 Cua Spaces 是“中继 + 计量”模式，本项目走直连，所以宣称不限会话数、不限远程时长、无需账号。

## 具体做法

以下命令与配置均取自 README，可直接复制；每步标注前提。

**1. 安装并打开本地面板**

前提：已装 Node.js / npm。

```sh
npm install -g github:migasrias2/geckobox
openspaces ui
```

面板只监听 `127.0.0.1`，链接里带随机 token，并拒绝其它 host，因此外部网站无法驱动它。

**2. 把其它计算机登记进来并做连通性检查**

前提：目标机可 SSH 登录（README 建议用 Tailscale 处理 NAT），且已安装要用的智能体 CLI。

```sh
openspaces computers add mini ssh:me@mac-mini.local
openspaces computers test mini             # reachable? which agents are installed?
```

`computers test` 会回答两个关键问题：能否连上、装了哪些智能体。

**3. 在本机用沙箱隔离跑（推荐的第一种执行环境）**

前提：macOS 26 可用 Apple 开源 `container` 运行时，或改用 Docker / Podman。

```sh
brew install container && container system start   # macOS 26: Apple's open-source runtime (or use Docker/Podman)
openspaces sandbox create dev                       # ~20 s: an isolated Linux VM with Claude Code installed
openspaces start --on dev "clone my repo and fix the failing test"
```

可选参数：`--agents claude-code,codex,gemini,opencode` 指定要装哪些；`--cpus` / `--memory` 定规格；`openspaces sandbox ls | stop | start | rm` 管理沙箱。沙箱内智能体以非特权 `agent` 用户运行且跳过权限询问——它能改动盒内任何东西，动不了盒外。

**4. 注入智能体登录凭据**

前提：Claude Code 订阅或 API key。

```sh
claude setup-token                                  # prints a long-lived subscription token
openspaces secrets set CLAUDE_CODE_OAUTH_TOKEN      # paste it; stored in the Keychain (account "openspaces")
```

说明：密钥经 stdin 进入沙箱，不出现在 argv，也不写入 `openspaces` 的状态或日志；单次任务也可用 `--env NAME` 转发某个变量。例外是 Cua 的 `sandbox exec` 不接受 stdin，走 Cua 时密钥会作为参数出现在本机命令行上。

**5. 发起任务、跟踪、续聊、收尾**

前提：已完成第 2 或第 3 步。

```sh
openspaces start --on mini "Upgrade the deps and run the tests"   # prints a thread id, runs in the background
openspaces logs <id> -f                    # watch messages and tool calls
openspaces send <id> --wait "Now open a PR"
openspaces status                          # every thread, every computer
openspaces close <id>                      # stops it and deletes its work dir
```

常用选项：`--agent`、`--cwd /abs/path`（在已有仓库里工作，且永远不会被删除）、`--keep`、`--model`、`--env NAME`、`--auto-approve` / `--no-auto-approve`。

**6. 一个任务同时下发到多台机器**

```sh
openspaces run --on local,mini,docker:ci "Run the test suite and summarise failures"
```

面板与 SDK 都提供同样的能力（“Run everywhere”，结果并排显示）。

**7. 用 SDK 编程接入（适合批量或由外部脚本触发）**

前提：Node/TS 工程，已安装依赖。

```ts
import { startThread } from "openspaces"

const bot = await startThread({
  agent: "claude-code",
  prompt: "Open the repo and run the tests",
  on: "local",            // or "mac-mini", "ssh:me@box", "docker:dev", "cua:desk"
})
console.log(await bot.wait())
console.log(await bot.send("Now fix the failing test"))   // same agent session, it remembers
console.log(await bot.status())
await bot.close()
```

```ts
import { fanOut, openThread, startThread } from "openspaces"

// Same job everywhere, results side by side.
const results = await fanOut(["local", "mini", "cua:desk"], {
  agent: "claude-code",
  prompt: "What OS are you on and how much disk is free?",
})

// Stream what the agent does.
const bot = await startThread({ agent: "claude-code", prompt: "…", onEvent: (e) => console.log(e) })

// Pick up a thread started elsewhere (for example from the CLI).
await openThread("claudecode-94419f2a").send("Carry on")
```

线程方法：`wait()`、`send(prompt)`、`status()`、`interrupt()`（停止本轮及其所有子进程但保留线程）、`close()`。把 `on: "local"` 换成另一台机器的名字，任务就跑到那台上。

**8. 人工接管与旁观**

前提：Mac 上开启 系统设置 → 通用 → 共享 → 屏幕共享；Linux 上运行任意绑定 localhost 的 VNC 服务。

```sh
openspaces view mini            # SSH tunnel to the Mac's Screen Sharing (VNC :5900), opens it; Ctrl-C closes
openspaces view mini --port 5901
openspaces view cua:desk        # Cua's own local viewer (loopback, no relay); the app streams it inline
```

隧道复用你已有的 SSH，不额外暴露端口。面板内也能以约 3 fps 看实时画面、点击/滚动/输入接管、暂停交接。

**9. 按环境设定权限策略（上线前必做的一步）**

前提：理解默认行为的差异。

- 智能体以无头方式运行，中途无法向你提问。
- 默认只在隔离环境（`docker:`、`cua:`）跳过权限询问。
- 在 `local` 和 `ssh:` 上，Claude Code 拿到的是 `--permission-mode acceptEdits`：文件编辑自动批准，其它工具按 Claude Code 自身规则来（原本会询问的一律拒绝）。
- 只有在你信任这台机器时才加 `--auto-approve`。
- `close` 只删目标机上的 `~/.openspaces/work/<thread>`，不删你传的 `--cwd`；pid 文件只在本轮存在，`close` 只杀它能确认属于该线程的进程。

## 对应的研究问题

**1. 能力发现（AI 还能做什么没想到交给它的事）**
README 给出的、超出“单机单对话”的用法有三类：一是同一任务在所有机器上并行跑并排比对结果（`run --on local,mini,docker:ci`、`fanOut`），例如跨机盘点系统与磁盘余量；二是后台长跑线程 + 事后 `send` 续聊，把“发起—等待—追问”解耦；三是实时旁观与随时人工接管同一台虚拟计算机（`view`、Take over），适合需要人机交替的半自动任务。

**2. 任务匹配（什么工作配什么模型/工具/协作方式）**
README 明确给出了适配器现状与调用方式，可直接用于选型：`claude-code`（`claude -p --output-format stream-json`，用 `--resume` 续接，**已实机验证**）、`shell`（提示词本身就是 shell 脚本，适合任务与冒烟测试，**已实机验证**）、`codex`（`codex exec --json` / `codex exec resume`，按文档写、未实机验证）、`gemini`（`gemini -p --output-format stream-json` / `--resume`，未验证）、`opencode`（`opencode run --format json` / `--session`，未验证）。另有 `--model` 可按任务换模型，`--agent` 按线程换智能体，新增适配器只需一个文件（`src/agents/`：拼 argv + 把输出行映射为事件）。隔离级别是可选的协作方式维度：不可信任务丢 `docker:`/`cua:`，可信机器才用 `--auto-approve`。

**3. 条件供给（要提供哪些信息、工具、权限、反馈）**
工具与信息的供给点很具体：目标机只需装智能体 CLI 本身（无守护进程、无账号、无中继）；`--cwd /abs/path` 让它在既有仓库里干活且不被清理；`--env NAME` 与 `openspaces secrets set` 把登录变量送进去（走 stdin，不进 argv、不进日志）；`--agents` 决定沙箱预装哪些 CLI，`--cpus`/`--memory` 决定资源。反馈通道有三条：`openspaces logs <id> -f` 看消息与工具调用、`status` 看所有线程与所有机器、面板内约 3 fps 的实时画面加点击接管。权限供给则用 `--auto-approve`/`--no-auto-approve` 与默认的 `acceptEdits` 显式控制。

**4. 主动推进（时间/事件/状态触发并持续完成）**
原文**没有**内置定时器、cron、webhook 或事件触发器，也没有“任务队列/重试”这类机制。它提供的是可被外部触发的原语：`start` 后台运行并打印 thread id、`send <id> --wait` 在既有会话上继续、SDK 的 `startThread`/`fanOut`/`openThread` 可在脚本里调用、`status` 可查询状态、`interrupt()` 只停本轮但保留线程。也就是说，“由外部 cron 或 CI 事件调用 CLI/SDK”这条路由是可行的，但属于使用者自行搭建的部分，原文并未给出。

**5. 效果验证（怎样判断确实改善了结果）**
原文提供的可观测手段是：`openspaces status` 汇总所有线程与所有计算机的状态；`run`/`fanOut` 把同一任务在多机的结果并排输出，便于横向比对；`logs -f` 给出消息与工具调用级别的过程记录；`view` 提供人工旁证。**但没有给出任何准确率、耗时或成本数据**，也没有定义成功指标，验证方案需要自己设计（见下节）。

## 与已有做法的关系

- **Claude Code（清单中状态：adopt）**：本项目在它之上加了一层调度与运行环境抽象——把 `claude -p --output-format stream-json` 起在远端/沙箱/容器里，用 `--resume` 维持同一会话，并用 `--permission-mode acceptEdits` 控制无头权限。它不是替代 Claude Code，而是把 Claude Code 从“本机一个终端”变成“多机多个后台线程”。清单里关于 Claude Code 的既有做法可直接沿用，本项目只改“在哪跑、谁触发、怎么观察”。
- **OpenCode（清单中状态：watch）**：README 把 `opencode` 列为已写适配器之一（`opencode run --format json`，用 `--session` 续接），但明确注明**未实机验证**。若清单后续要推进 OpenCode，本项目可当作一个现成的托管/分发外壳来试，但要先自查适配器是否真的通。
- **Cursor（清单中状态：watch）**：清单条目与本文无交集，README 未提及 Cursor，也不支持其作为 agent 适配器。

## 证据与局限

**证据（原文给出的具体内容）**：可复制的安装/沙箱/密钥/CLI/SDK 命令与代码；五种 agent 适配器的确切调用方式与验证状态；权限与密钥处理的明确规则（stdin 传输、不进 argv 与日志、Cua 例外）；清理语义（`close` 只删工作目录，不删 `--cwd`；只杀可确认的 worker 进程）；本地状态目录权限 0700/0600；面板绑 `127.0.0.1` + 随机 token + 拒绝其他 host；沙箱约 20 秒创建、实时画面约 3 fps；与 Cua 的对照表（Cua Free 2 / Pro 5 会话，Geckobox 不限；Cua Free 20 / Pro 200 远程小时，Geckobox 不限；Cua 需账号，Geckobox 不需要；Cua FSL-1.1，Geckobox MIT）；项目自带 `npm test` 覆盖单元、进程内线程、HTTP API 与 CLI 端到端。

**只是作者主张、未经本文材料佐证的部分**：“Free, with no limits”与“无限会话/无限远程小时”是对比竞品计费方式得出的推论，不是压测结果；“独立净室实现、不含 Cua 代码”无法从 README 验证；`codex`、`gemini`、`opencode` 三个适配器**作者自述未实机验证**；仓库仅 48 stars，属早期项目，缺少外部使用案例与长期稳定性证据；**全文没有任何性能、成本或任务成功率数据**。

**适用条件与风险**：① 目标机必须能 SSH / 跑容器，且已装对应智能体 CLI；跨 NAT 需自行上 Tailscale 或等价方案（README 明确不提供托管中继）。② 在 `local` 与 `ssh:` 上默认 `acceptEdits` 会自动批准文件编辑——对生产仓库是实质风险，务必用 `--cwd` 指向副本或 git worktree，或干脆改在沙箱里跑。③ `--auto-approve` 等于交出整台机器。④ 无团队角色/分享链接/密钥保管（keyvault、teleport 均标注“not yet”），多人协作需自行加 SSH 用户或共享 tailnet。⑤ 无原生 Mac/iPhone 应用，只有本地 Web 面板。⑥ 无调度与重试，长跑任务的可靠性由使用者兜底。

## 怎么试、怎么验证

**最小试用（半天内可完成，风险可控）**

1. 在一台开发机上 `npm install -g github:migasrias2/geckobox` + `openspaces ui`，确认面板只在 `127.0.0.1` 起来、外部 host 被拒。
2. 只做**只读**任务先跑通链路：`openspaces start --on local "列出当前仓库的目录结构与测试命令，不要修改任何文件"`，用 `logs -f` 观察事件流，再 `send <id> --wait` 追问一句，确认会话确实被 `--resume` 续上。
3. 加一台 SSH 机器：`computers add` → `computers test`，确认返回“可达 + 装了哪些 agent”，再在同一台机上重复第 2 步的只读任务。
4. 做一次多机 fan-out：`openspaces run --on local,mini "报告 OS 版本与剩余磁盘，不要改动系统"`，检查结果是否并排可读、是否各机互相隔离。
5. 最后才试写操作：用 `--cwd` 指向一个 **git worktree 副本**，跑一次“修一个失败的测试”，事后核对：`--cwd` 未被删除、工作目录之外无改动、`close` 后目标机 `~/.openspaces/work/<thread>` 已清空。

**判断有没有改善的指标**

- **任务成功率**：同一批任务（建议 5–10 个，含修测试、依赖升级、跨机盘点）在“手工单机逐个做”与“openspaces 多机并行”两种方式下的完成率对比。
- **端到端墙钟时间**：从下达到拿到可用结果的时间，尤其看 fan-out 是否真的把 N 台机器的串行等待压成 1 份。
- **人工介入次数**：每条线程里你实际需要 `send` 纠正、接管或重跑的次数——这是“无头运行是否可靠”的最直接信号。
- **会话连续性**：`send` 之后智能体是否记得上文（验证 `--resume` 生效），失败率要单独记。
- **权限事件**：因 `acceptEdits` 自动放行而产生的非预期文件改动次数，目标应为 0。
- **成本与配额**：每任务的模型用量/费用（配合 `--model` 对比），以及是否出现因无重试导致的整轮作废。
- **清理正确性**：`close` 后残留目录数、被误删的 `--cwd` 数（应为 0）。

**明确的止损线**：若 `codex`/`gemini`/`opencode` 适配器在你的实际环境中跑不通（作者已声明未实机验证），就只保留 `claude-code` 与 `shell` 两条路径使用；若 SSH 机器上出现任何非预期文件改动，立即把该机的执行环境切换到 `docker:` 沙箱后再继续。
