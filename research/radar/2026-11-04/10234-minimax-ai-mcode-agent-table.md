# MiniMax-AI/mcode-agent-table

- 结论：**值得一试**。先按 README 跑通离线 demo 和测试，再搭一桌两 owner 的小任务，验证「propose→approve→execute→verify」这条审批-执行-验证闭环；这套东西真正可复用的是把「谁批准、谁执行、谁验证、何时必须停」写成协议和账本，而不是多代理框架本身。但它还只是 v0.1、单机运行、缓存收益未测量、生态很早期，建议小范围试用，不要直接当生产方案写进手册。
- 原文：https://github.com/MiniMax-AI/mcode-agent-table
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T12:22:14.992Z

## 是什么

mcode-agent-table 是 MiniMax Code 团队发布的 BYOB（Bring Your Own Bot）Table Protocol v0.1 及其 TypeScript 参考实现。它不托管任何人的 bot，而是给不同 owner 的 bot 提供一张「桌子」：共享账本（ledger）、席位（seat）、发言权控制（floor control）和提交网关（commit gateway）。

核心规则只有一句：**bots propose; the affected owner approves; that owner's own bot executes; another seat verifies.**（bot 提议，受影响的 owner 批准，该 owner 自己的 bot 执行，另一个席位验证。）

组成：Table Core（唯一账本写入者，JSONL 持久化，可 replay 重建 floor/seats/tasks/budget）；`byob serve` 起的表主机，走 `/v0.1` 下的 HTTP + SSE；席位 SDK（owner 的 Ed25519 密钥、签名、披露拦截）；MCode 适配器；带 12 个工具的 MCP 桥；`byob` CLI；以及 Rabbit Hole Mini App。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 环境准备（前提：Node ≥ 22.19）**

```bash
git clone https://github.com/MiniMax-AI/mcode-agent-table && cd mcode-agent-table
npm install
npm test                 # vitest: core, topologies, tasks, HTTP/SSE, persistence, MCP bridge, Rabbit Hole
npm run demo:scripted    # offline run: debate -> decision -> owner approval -> execute -> verify
```

`demo:scripted` 是离线跑，不需要任何 API key。

**2. 起一张桌子（前提：终端 1）**

```bash
npx tsx src/cli.ts serve --port 7341 --data ./data
```

**3. 生成 owner 密钥并建桌（前提：终端 2；`tao.owner.json` 含私钥，不能外传）**

```bash
npx tsx src/cli.ts keygen tao --out tao.owner.json      # keep this file private
PK=$(node -p "require('./tao.owner.json').publicKey")
cat > table-config.json <<JSON
{ "id": "my-table", "topic": "hello",
  "owners": { "tao": { "public_key": "$PK" } },
  "topology": { "kind": "broadcast", "order": ["bot-tao"], "rounds": 2 },
  "termination": { "any": ["rounds_exhausted"] } }
JSON
npx tsx src/cli.ts create table-config.json             # prints the table id and an admin token
```

关键约束：`termination` 不能省。省掉后 `create` 直接拒建（HTTP 层报 `E_SCHEMA`，Table Core 里是 `E_NO_TERMINATION`）。完整配置格式（visibility、floor、watchdog、sub-tables）见 SPEC.md §3。

**4. 入座、发言、读投影**

```bash
npx tsx src/cli.ts join my-table --owner tao.owner.json --seat bot-tao --bot my-agent --out tao.seat.json
npx tsx src/cli.ts say  --seat tao.seat.json "hello table"
npx tsx src/cli.ts read --seat tao.seat.json            # prefix + tail for this seat
```

注意 `read` 拿到的是本席位的投影：稳定前缀（规则、席位、决议）+ 追加式尾部，无时间戳，所以 prompt 缓存能持续命中。

**5. 接任意 MCP agent（Claude Code / Codex / Cursor 等；前提：agent 跑在 owner 自己的机器上）**

```json
{ "mcpServers": { "byob": {
    "command": "npx", "args": ["tsx", "/path/to/mcode-agent-table/src/cli.ts", "mcp"],
    "env": { "BYOB_URL": "http://127.0.0.1:7341", "BYOB_TABLE": "my-table",
             "BYOB_OWNER_KEY_FILE": "/path/to/tao.owner.json",
             "BYOB_CARD_FILE": "/path/to/tao.card.json" } } } }
```

12 个工具：`byob_join`, `byob_read_projection`, `byob_say`, `byob_pass`, `byob_raise_hand`, `byob_propose`, `byob_decide`, `byob_approve`, `byob_status`, `byob_receipt`, `byob_verify`, `byob_memory`。

要点：能力卡来自 `BYOB_CARD_FILE`，**永远不来自 agent 自己**；`byob_approve` 通过 MCP elicitation 请 owner 确认，客户端无法提问时直接拒绝；owner 也可以随时自己跑 `byob approve`。

**6. 自己写代码接入（前提：手上有密钥保管方案）**

```ts
import { Owner, SeatClient, runSeat } from './src/client.js';
const me = new Owner('alice', keysFromYourVault);
const seat = await SeatClient.join(url, 'my-table', me, { seat: 'alice-bot', card: { bot: 'my-agent', capabilities: [] } });
await runSeat(seat, {
  onFloor: async (p, { first }) => ({ kind: 'say', body: await myAgent(first ? p : p.tail) }),
});
```

**7. 走一次跨 owner 的动作（这是整套协议最值得抄的部分）**

propose → 受影响 owner 签名批准 → 在该 owner 自己的 bot 里执行 → 另一个席位 verify。**bot 说 done 只是「发言」，账本状态到 `verified` 才算完成。** 沉默的任务由 watchdog 标成 `stalled`。

**8. 看一个真实三方会话（前提：`mcode` ≥ 0.6.3 在 PATH 上，且有 MiniMax API key）**

```bash
MINIMAX_BENCH_KEY=... npm run demo:mcode    # optional: MINIMAX_BASE_URL, BYOB_DEMO_MODEL
```

场景：`bot-tao`（正）、`bot-jenny`（反，持有团队 taskboard 和私有记忆）、`judge`（只看到双方发言）三方辩论，外加一个确定性 `checker` 占第四席。judge 的决议要动 Jenny 的 taskboard，因此等 Jenny 签名批准；Jenny 自己的 MCode 改文件并回执；checker 验证。账本、transcript、每轮 token 用量在 `demo/out/`。

**9. 可选：Rabbit Hole 界面（前提：单机）**

```bash
npm run build:miniapp    # bundles Table Core into apps/rabbit-hole/miniapp/node (generated, not committed)
```

然后让 MiniMax Code 安装 `apps/rabbit-hole` 里的 Mini App。可从页面开会议（debate / round table / pipeline），也可让 agent 调 `hole_open`、`hole_join`、`hole_wait`、`hole_post`、`hole_memory`。注意：每个能力都需要 owner 在页面上签名，**没有任何 MCP 工具能代签**。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——弱。** README 确实把「多方辩论 + 确定性 checker 校验 + 第三方裁决」摆成可用结构（三 agent + 一 checker 的实跑 demo），但没有给出具体工作任务的清单或边界，只能说它示范了「分歧本身是有用产物」这一类用法。

**2. 任务匹配——强。** 拓扑即策略：`broadcast`、`debate`、`pipeline`、`hub_spoke`、`delegation` 和子表（sub-tables）都跑在同一本账上，因此同一套协作设施可按任务形态换结构。接入路径有两条：MCode 适配器（走 `@minimax-ai/code-sdk`，每席一个 session，首轮发 prefix+tail，之后只发新 tail）和任意 MCP agent（Claude Code / Codex / Cursor）。每席位有自己独立投影，前缀稳定、尾部追加，为 prompt 缓存设计。

**3. 条件供给——很强。** owner 签名的席位（对 table id、seat、card 和 nonce 做 Ed25519 签名，bot 不能代签也不能自己扩权）；能力卡由 owner 侧文件决定；deny 规则跑在 seat SDK 里，被拦的发言根本到不了桌面；floor control 规定只有持麦者能发言（否则 `E_NOT_FLOOR`），`pass` 是合法回合，超预算的帖子被 Table Core 截断，bot 间对话有深度上限、到了就交还人类。这基本就是「给 AI 什么权限、谁来兜底」的一份可执行清单。

**4. 主动推进——部分。** 强制终止条件（无终止条件的表直接拒建）、`watchdog` 把沉默任务标 `stalled`、`byob_raise_hand`、SSE 推送，这些是时间/状态驱动的雏形；但 README 里没有「按时间或事件自动发起并持续推进」的机制，watchdog 只是兜底检测。投票与法定人数终止、多 owner 提案都在 roadmap 里。

**5. 效果验证——很强，是这份材料最硬的部分。** 唯一算完成的状态是账本里的 `verified`，且必须由**不同席位**验证；执行方要发 receipt；示例里专门放了一个确定性 `checker` 席位；账本是 append-only、`seq` 1..n 无缺口，replay 能精确重建 floor、seats、tasks、budget。

## 与已有做法的关系

清单里相关的有：**Claude Code（adopt）**、**Cursor（watch）**。

原文的 MCP 桥明确把 Claude Code、Codex、Cursor 列为「任意 MCP agent」的接入对象——即这些已有工具是坐在席位上的 bot，而 byob 只补协作层与审批层，不替换它们。所以它和清单里的工具是叠加关系而非替代关系：Claude Code 继续干活，byob 负责「谁批准、谁执行、谁验证、何时停」。除此之外，清单中没有其他相关条目。

## 证据与局限

**原文给出的可核查证据：** 可运行的完整 CLI 命令序列、`table-config.json` 与 MCP 配置、SDK 代码片段；`npm test` 覆盖 core、topologies、tasks、HTTP/SSE、persistence、MCP bridge、Rabbit Hole；`demo/out/` 存有真实会话的账本、transcript 和每轮 token 用量；架构图、账本投影图、任务生命周期图。这些都可自行复现。

**只是作者主张、或作者自己承认未验证的：**
- prompt 缓存效果：roadmap 明说 projections 保住了稳定前缀、MCode 适配器也做到了每席一个 session，但「we have not measured or tuned the cache hit rate yet」。
- v0.1 只能在一台 table host 上跑；联邦（federation）是 roadmap 第一项。
- 目前只有入座和审批有签名，**每条帖子尚未签名**（靠 seat token 认证），这也是 roadmap。
- 多 owner 联合提案、投票/法定人数、WebSocket、A2A 桥都在 roadmap。
- Rabbit Hole 只跑单机。
- 仓库 30 stars，非常早期；README 没有给出任何性能、成本或准确率数据。

**适用条件：** Node ≥ 22.19；多 owner / 多信任域的场景才有意义（单人单 bot 用它纯属加复杂度）；要自己跑 table host；真实 MCode demo 还需要 `mcode` ≥ 0.6.3 和 MiniMax API key。

## 怎么试、怎么验证

**最小试用 A（半小时，零成本）：** 跑 `npm test` + `npm run demo:scripted`，然后翻 `demo/out/`，把一条任务从 propose → approve → execute → verify 的账本轨迹逐条读出来。目的是确认「说 done ≠ 完成」这条约束真的在代码里。

**最小试用 B（半天，推荐）：** 起 `serve`，造两个 owner 密钥、两个席位：一个是人（你自己），一个是接进 Claude Code 的 MCP agent。给它一个真实小任务，比如改一份配置文件的某个字段。要求它走 `byob_propose`，由你 `byob approve`，由**另一个**席位 `byob_verify`。全程不手工绕过。

**判断有没有改善的指标：**
- 未经批准的动作数应为 0（deny 在 seat SDK 里，被拦的帖子根本到不了桌面——可以去账本核对确实没出现）；
- 「bot 自称完成但实际未 verified」的次数——这个数大于 0 才说明这套机制在替你干活，如果一直是 0，说明任务太简单，不值得上这套；
- 任务从 propose 到 verified 的耗时，对比原来纯人工催办的耗时；
- `stalled` 任务数（watchdog 是否真的抓到了沉默任务）；
- 每轮 token 用量，与 `demo/out/` 里的录制数据做参照，顺便自己测一次缓存命中——作者没测，你可以补上；
- 需要人工返工的 `verified` 任务比例，这直接检验「另一席验证」是不是形同虚设。
