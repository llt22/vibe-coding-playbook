# reason-machines/reason-network

- 结论：**值得一试**。若团队已经在用 Reason CLI 并且成员都在同一 workspace，可以小范围试用 reason network：用 `reason network who` 和 `reason network <session> "..."` 让两个 agent session 直接互相问答，观察是否减少人工中转。理由是原文给出了可复制的安装命令、CLI 命令和 MCP 工具名，但完全没有效果数据，且强依赖 Reason 产品与团队整体部署。
- 原文：https://github.com/reason-machines/reason-network
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T22:16:31.872Z

## 是什么

reason-network 是 `reason network` 背后的引擎：每台电脑上跑一个小 daemon、它自己的 MCP server，以及它接到各 agent 上的 hooks。作用是让团队里每个人电脑上的编码 agent（README 列举：Claude Code、Codex、Cursor、Gemini CLI、Copilot CLI、opencode、pi 和 Reason）互相可见——每个 session 能看到现在谁在做什么，并能直接给对的那个 session 发消息。

连接方式是点对点：同 Wi-Fi 直连，跨公网走 iroh，直连失败时经中继（中继只看到加密字节）。只有团队成员能连，且一台电脑只能代表它自己的主人说话。发给离线者的消息会排队，等对方回来再发。状态存放在 `~/.reason/network`。

不用手工安装：Reason CLI 会在你首次运行相关命令时下载一个固定版本、校验过 checksum 的构建并配置好。

## 具体做法（编号步骤）

前提：你使用 Reason CLI 与 Reason workspace，且团队其他成员也在同一个 Reason workspace 里（README 称「Everyone in your Reason workspace is on the same network」）。以下命令与配置均照原文抄录。

1. 初始化本机 agent 接线（Reason CLI 自动下载并安装固定版本）：

```sh
reason network
```

2. 看谁在线、各自的 session 正在做什么：

```sh
reason network who
```

3. 直接向某个 teammate 的某个 session 提问，并等它回答（示例中的 `alice/api-claude` 是「某人/某个 session」的寻址形式）：

```sh
reason network alice/api-claude "did the token format change?"
```

4. 只发不等（通知类）：

```sh
reason network send alice/api-claude "heads up: main is red"
```

5. 需要时把本机的 agent 重新接线一遍：

```sh
reason network setup
```

6. Agent 侧不再需要额外接入脚本。MCP server 名为 `reason-network`，对 agent 暴露三个工具：`list_team`、`send_message`、`check_inbox`。session「在做什么」的信息来自它自己的 title 和 todo list，agent 不需要主动汇报状态——所以要让这套东西好用，agent 的会话标题和 todo 得是有意义的。

7. 注意消息投递时机按 agent 类型不同：Claude Code、Codex、opencode、pi 和 Reason 会在会话中途收到消息，空闲的会被唤醒；Cursor、Gemini 和 Copilot 在下一步才收到。已经打开的 Claude session 不需要重启就能加入。

8. 若要从源码自建或跑测试（README 的 Build 段）：

```sh
cargo fmt && cargo clippy --all-targets -- -D warnings && cargo test
cargo build && python3 tests/e2e/two_machines.py   # two machines over iroh (needs internet)
python3 tests/e2e/hooks.py && python3 tests/e2e/guided.py
```

`v*` tag 会构建 Reason CLI 所安装的 macOS 和 Linux 包。

## 对应的研究问题

**1. 能力发现**：它把「agent 之间横向通信」当作一件以前默认由人来做的事交给 AI——一个 session 可以直接问另一个 session，不必由人转述。这是原文明确的功能主张。

**2. 任务匹配**：原文按 agent 类型给出了投递语义的差异，可作为「哪种 agent 适合同步问答、哪种适合异步通知」的判据——Claude Code / Codex / opencode / pi / Reason 支持会话中投递并能唤醒空闲 session，适合 `reason network <session> "..."` 这种等回答的用法；Cursor / Gemini / Copilot 只能在下一次取消息，只适合 `send` 这种「不指望立刻回应」的通知。

**3. 条件供给**：需要（a）每台机器上的 daemon 与 MCP server `reason-network` 及三个工具权限；（b）团队成员都在同一 Reason workspace；（c）网络可达——同 Wi-Fi，或经 iroh 跨公网，或经中继兜底；（d）本机状态目录 `~/.reason/network` 可用；（e）各 session 维护好自己的 title 和 todo，因为这是别人判断「你在做什么」的唯一信息来源。

**4. 主动推进**：原文给出的触发是消息事件驱动的——发给离线者的消息会等待并在其回来时发出；空闲的 session 会被消息唤醒；不支持投递的 agent 会在下一步拿到消息。未提及定时触发或状态触发。

**5. 效果验证**：README 没有给出任何效果数据、指标或案例。这一项只能自建，见最后小节。

## 与已有做法的关系

清单中的条目：
- **Claude Code（adopt）**：是被支持的 agent 之一，且是投递体验最好的一档——会话中途可收消息、空闲会被唤醒、已打开的 session 免重启加入。
- **Cursor（watch）**：被支持，但属于「下一步才收到消息」的异步档。
- **OpenCode（watch）**：被支持，且属于会话中投递、可唤醒空闲 session 的一档。

清单中没有覆盖「多 agent 跨机通信 / 用 MCP 把团队的 agent 连成一张网」的条目，本线索补的是这一块。另外，它的三个 MCP 工具设计（`list_team` / `send_message` / `check_inbox`）可以脱离本产品，作为自建同类能力时的接口参照。

## 证据与局限

**原文给出的、可直接照做的部分**：安装方式（Reason CLI 自动下载校验后的固定构建）、四条 CLI 命令、MCP server 名与三个工具名、按 agent 区分的投递时机、网络与安全模型（P2P / iroh / 中继只看到密文、仅团队成员可连、一台机器只代表本人）、状态目录、源码构建与测试命令。

**只是作者主张、没有数据支撑的部分**：整套「团队协作因此变好」的说法；README 没有任何使用数据、性能数字、前后对比或用户案例。仓库 33 stars，成熟度无从判断。

**适用条件与局限**：
- 强依赖 Reason CLI 和 Reason workspace，不是通用方案；团队不在这个生态里就用不上。
- 要求团队整体部署，单人无法自测出「团队通信」的价值。
- README 没有给出手动配置 MCP 的方法，也没有提示词层面的指引——agent 侧怎么用那三个工具，原文未展开。
- 投递时机、离线排队、唤醒空闲 session 等行为均来自 README 自述，未经独立验证。

## 怎么试、怎么验证

**最小试用方式**：找 2 名已经在用 Reason 的同事，各自装好 Reason CLI、确认在同一个 workspace。两人各开一个 Claude Code session（因为它是投递体验最好、最可能成功的一档），分别跑 `reason network who` 互相确认能看到对方的 session 和当前在做的事；然后由 A 用 `reason network <b的session> "..."` 提一个只有 B 的 agent 凭自己会话上下文才能回答的问题（例如「你当前分支上 token 格式改了吗」）。

**判断有没有改善的指标**：
1. `who` 能否稳定列出对方 session 及其当前任务（验证 title / todo 作为状态来源是否够用）。
2. 端到端拿到回答的时延，对比「人来转述」的基线。
3. 一次协作中人工中转的次数是否下降。
4. 消息在哪几个 agent 上是中途可见、哪几个要等到下一步，是否与 README 描述一致（验证任务匹配的那条判据）。
5. 关掉一端后发消息、再重连，消息是否补发到（验证离线排队）。

**停止条件**：如果团队不在 Reason workspace，或找不到第二个人配合，本线索就退化为思路研读——可以借鉴它的 MCP 三工具接口设计（`list_team` / `send_message` / `check_inbox`）和「状态来自 session 自己的 title 和 todo、不需要 agent 主动汇报」这一条，自建轻量版本。
