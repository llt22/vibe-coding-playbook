# 给 AI 代理装上「操作单」：可校验、可整批回退、敏感改动先过人

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让 AI 代理改结构化文件或共享工作区时，把它的动作收敛成可校验、可整批回退、按对象限权的操作，而不是让它自由改文件或看截图逐步操作。
> 先试这一步：先拿一份真实文件走一遍做法 A 的最小闭环：`pnpm opencalque new` 建空文档，手写一个两三条操作的 ops.json，`apply` 后 `describe` 看是否落地，`validate` 应无输出、退出 0。
> 最近修订：2026-10-27

## 解决什么问题

让 AI 代理直接改文档、图纸、表格这类结构化文件，或和人共用一份实时工作区时，风险有三类：一是它产出的内容不合法，把文件改坏；二是改完之后无法整体回退，只能人工逐条修；三是多人多代理同场时，不知道谁动了哪个对象，价格、日期、承诺这类字段被直接改掉。这本手册收录两种把「代理能做什么」收敛住的样板——做法 A：代理只输出纯 JSON operation，由本地 CLI 执行，整批 all-or-nothing、每个结果都校验、整条请求用一次撤销回退；做法 B：人和多个代理在同一份实时状态上协作，代理按对象分配权限，敏感改动以「建议」形式提交给人确认。

两者是一件事的两端：A 管产出物怎么落地、怎么回退；B 管多人多代理怎么共享同一份状态、敏感改动怎么过人。需要说明：A 是建筑制图工具的具体实现，通用性来自类比；B 只有 README，权限模型与记忆文件格式的细节未提供；两者都没有「工作结果是否改善」的评测数据。

## 适用与不适用

适用：

- 改动能用一串可校验的操作精确表达（做法 A 的前提）。OpenCalque 的 README 把「按描述生成/修改图纸」算作可交给模型的活。
- 结构化产出（画平面、批量加对象、导出）交给脚本或代理、人只做手工微调。示例图纸 `examples/apartment.opencalque` 自称由一个 100 行脚本用编辑器同一套 operation 生成，`examples/studio.opencalque` 由 `examples/studio.ops.json` 经 CLI 生成。
- 需要数据不出本机（本地 Ollama），或想复用已登录账号、不另配 key（桌面版 Claude Code CLI）。
- 多人和多个代理要在同一份实时对象（文档、表格、画布、浏览器、桌面）上工作，且希望敏感字段由人确认（做法 B）。
- 想先在本机或内网小范围验证「agent 直接编辑同一份实时对象、敏感改动转人工确认」能否减少复制粘贴和来回等待（做法 B）。

不适用 / 局限：

- 做法 A 是建筑制图领域的工具，领域外的通用性只是类比；编辑器内 assistant 需自备 provider 或本地模型。
- 做法 A 构建未签名；文件格式只承诺「从 1.0 起保持可读」，当前仍在变动。
- 做法 B 为 v0.2.0、首次公开发布、大量代码由 Claude Code 写成；没有账号体系，任何能访问服务器的人都能用任意名字加入；默认每服务器一个 Docker 桌面；语音需额外 speech key。
- 两者都没有不同模型的效果对比、AI 生成质量的评测，也没有第三方复现记录。
- README 没写基于时间/事件/状态触发的常驻流程；「批量/CI 式产出」只能从「示例文件由脚本生成」推出可能，原文未给具体做法，不作结论。

## 前置条件

通用：

- 先判断改动能否写成一串可校验的操作。能，优先走做法 A：成本低、可整批回退、不留半成品。
- 只有当「多人同时在同一份状态上工作」或「敏感改动必须过人」是硬需求时，才上做法 B。两者不互斥，可组合。

做法 A：

- Node ≥ 22、pnpm ≥ 9；git。
- 要用编辑器内 assistant，需四选一 provider：Claude（Anthropic API key）；本机安装的 Claude Code CLI（仅桌面应用，用已登录账号，无需 API key）；本地 Ollama（桌面应用开箱可用；浏览器里需给 Ollama 设 `OLLAMA_ORIGINS`）；任意支持 tool calling 的 OpenAI chat-completions 服务。
- CLI 不随 app 安装，必须在上一步的仓库 checkout 里执行。
- 桌面应用连非本机服务前会问一次；构建未签名，首次运行需放行（Windows：More info → Run anyway；macOS：右键 Open）。

做法 B：

- Docker 与 Node 24；准备一个 LLM key（Anthropic 或 OpenAI）。
- 可选：ElevenLabs 或 OpenAI 的 speech key（agent 在语音 huddle 里出声）；E2B key（每对象一个桌面）。
- 默认只监听 localhost。对外开放前必须先读 `docs/security.md` 并自建认证网关——当前没有账号体系。

## 操作步骤

### 做法 A：把代理的改动收敛成 operation 批次（单机 / 脚本）

适合单人、需要精确可重复、由脚本或代理批量产出的改动。

1. 起环境。前提：Node ≥ 22、pnpm ≥ 9。

```sh
git clone https://github.com/laurent512/opencalque.git
cd opencalque
pnpm install
pnpm dev          # 桌面应用（热重载）；pnpm dev:web 为浏览器版
```

不装环境也可用网页版 opencalque.com，或从 releases 页下载安装包。预期结果：应用起得来，能打开或新建文档。

2. 在 Preferences 里配 assistant（四选一，见前置条件）。预期结果：Assistant 面板能发出一条请求并拿到回复。

3. 用自然语言下指令并控制会话。右侧 Assistant 面板 `Ctrl+J`，例如 `draw a 5 × 4 m room with a door on the bottom wall`；整条请求用一次 `Ctrl+Z` 撤销；`/new` 新会话、`/resume` 恢复、`/model` 换模型、`/clear` 清空；`Ctrl+V` 或回形针贴草图。预期结果：指令落地成文档改动；一次撤销把整条请求整体回退。

4. 用 CLI 走一遍最小闭环。前提：CLI 不随 app 安装，必须在仓库 checkout 里执行。

```sh
pnpm opencalque new plan.opencalque "My plan"                   # 新文档固定自带 page_1 和 layer_1
pnpm opencalque describe plan.opencalque                         # JSON 摘要，作为给 AI 代理的上下文
pnpm opencalque apply plan.opencalque examples/studio.ops.json   # 应用一个 operation JSON 数组
pnpm opencalque validate plan.opencalque                         # 有问题则退出码 1 并列出
pnpm opencalque schema --out schema                              # 导出文档与 operation 的 JSON Schema
pnpm opencalque pdf plan.opencalque --out plan.pdf               # 每张图纸一页，真实尺寸与比例
```

预期结果：`new` 建出带 `page_1`/`layer_1` 的空文档；`describe` 打印 JSON 摘要；`apply` 成功后 `describe` 里能看到改动；`validate` 无输出、退出 0。

5. 让代理只输出 operation 批次。把 `describe` 的输出（连同 `schema`）喂给模型，要求它只输出 operation 的 JSON 数组，再用 `apply` 落盘。

```json
[
  { "op": "add_layer", "layer": { "id": "furniture", "name": "Furniture", "color": "#2563eb" } },
  { "op": "add_node", "node": { "type": "wall", "parent": "page_1", "a": { "x": 0, "y": 0 }, "b": { "x": 6000, "y": 0 }, "thickness": 200 } },
  { "op": "update_node", "id": "n_1", "patch": { "thickness": 300, "name": null } },
  { "op": "remove_node", "id": "n_1" }
]
```

要点：`add_node` 省略时自动生成 `id` 和 `order`；`update_node` 是浅合并，`null` 删属性；整批 all-or-nothing 且每个结果都校验，所以脚本或模型无法把文档改坏。单条 operation 也可以小到一条墙：

```json
{ "op": "add_node", "node": { "type": "wall", "parent": "page_1", "a": { "x": 0, "y": 0 }, "b": { "x": 6000, "y": 0 }, "thickness": 200 } }
```

预期结果：合法批次整体落盘；不合法批次整体不落盘，`apply` 报错，文档保持原样。

6. 从代码里调用同一套模型（可选）。`applyOps` 返回新文档（文档不可变）。

```ts
import { applyOps, createDocument, serializeDocument } from '@opencalque/core'

const doc = applyOps(createDocument('Plan'), [
  { op: 'add_node', node: { type: 'rect', parent: 'page_1', x: 0, y: 0, width: 1200, height: 700 } },
])
```

### 做法 B：让人和多个代理在同一个实时房间协作

适合多人 + 多个代理同时改同一份状态、且敏感字段要过人的场景。

1. 安装依赖并进入应用目录。前提：Docker、Node 24，LLM key 在手。

```sh
npm install
cd apps/airlink
```

2. 复制环境变量模板并填入 LLM key。

```sh
cp .env.example .env            # add ANTHROPIC_API_KEY or OPENAI_API_KEY
```

预期结果：`.env` 里至少有一个可用的 key。

3. 启动依赖服务（Postgres、LiveKit、共享浏览器、桌面）。

```sh
docker compose up -d            # Postgres, LiveKit, the shared browser and the desktop
```

4. 启动开发服务器。

```sh
npm run dev                     # → http://localhost:3030
```

5. 验证房间与 agent。用两个浏览器窗口打开 `http://localhost:3030`，各取一个名字，在 `#general` 里打招呼。预期结果：agent 会回复；底部 dock 可添加 doc、sheet、canvas、slides、browser、desktop 或 huddle，人和 agent 改的是同一份对象。

6. 接入你要用的 agent。README 给出的接入面：本地 CLI（Claude Code、Codex、Gemini CLI、opencode，从 PATH 取）、模型 API（Anthropic/OpenAI/Google/OpenRouter/Groq/xAI/Mistral/DeepSeek）、或通过 MCP 接入自定义 harness。可交给 agent 的活（README 列出）：实时填充带公式的预算表格、起草计划文档、在画布上画流程、用共享浏览器做研究（人可随时接管）、在语音 huddle 中旁听并作答、长任务后台跑完后回报到通话中。

7. 给每个 agent 配对象级权限，并把敏感字段设成「建议—人工确认」。README 描述权限按「每个 agent、每个对象」分配，价格、日期、承诺类改动以建议形式提交给人确认。具体配置格式材料未提供，需按仓库里的 `docs/agents.md`（本次未提供）核实。

8. （可选）开启语音。在 Settings 里填入 ElevenLabs 或 OpenAI 的 key，agent 才能在 huddle 中出声；否则只在聊天里回答。

9. （可选）扩展桌面数量。默认为「每服务器一个 Docker 桌面」；README 称设置 E2B key 可获得「每个对象一个桌面」。

10. （可选）基于 SDK 搭自己的应用。

```sh
npm create airlink@latest my-app full     # or room-react, agent-node
```

11. （可选）自测性能，按 README 给出的基准脚本。

```sh
cd apps/bench
LIVE_JWT_SECRET=<secret> node src/bench.ts --server ws://localhost:3020 --rooms 1 --clients 2 --seconds 30
LIVE_JWT_SECRET=<secret> node src/load.ts --rooms 50 --clients 10 --rate 5 --seconds 60
LIVE_JWT_SECRET=<secret> node src/video.ts --samples 20
```

12. 安全前提（README 明确要求）：默认只监听 localhost；对外开放前先读 `docs/security.md`，并自建认证网关。

### 怎么选

- 单人、要精确可重复、要能整批回退、产出要落成文件 → 做法 A。
- 多人 + 多个代理同场、改动要实时看见、敏感字段必须过人 → 做法 B。
- 两者可组合：先用 A 的思路（可校验操作 + 原子批次 + 校验 + 回退）约束「代理能提交什么」，再看是否真的需要 B 的实时共享。不要因为「实时协作听起来更好」就直接上 B——它当前没有账号体系，暴露到内网之外前必须先补认证。

## 怎么判断变好了

最小试用：

做法 A（半天内）：

1. `git clone` + `pnpm install`，`pnpm opencalque new` 建空文件；手写一个两三条 wall/rect 的 ops.json，`apply` 后 `describe` 看是否落地，`validate` 应无输出、退出 0。
2. 配 Ollama（或 Claude Code CLI）为 provider，在 Assistant 里发「画一个 5 × 4 m 房间，下墙开门」，再 `Ctrl+Z`，确认一次撤销能整体回退且文档仍然合法（`validate` 通过）。
3. 把 `describe` 的输出直接喂给你平时用的代理（如 Claude Code），让它产出 ops JSON，`apply` 后数一下需要人工修正几处。

做法 B（一件真实小任务一轮）：按 quickstart 在本机起一个房间；邀请 1 名同事；接入 1 个本地 CLI agent（Claude Code）+ 1 个 API 模型 agent；选一件真实的小任务，例如「填一份带公式的季度预算表 + 在画布上画对应的流程 + 用共享浏览器查两个价格来源」。全程不要复制粘贴，让人直接在房间里用光标和聊天驱动 agent。

可观察的指标：

做法 A（与「手工画」或「纯对话式让模型给代码」对比）：

- `apply` 失败率与 `validate` 报错次数；
- 从提出需求到得到可用图纸的往返轮数；
- 需要人工改动或撤销重建的操作数；
- 同一请求在本地模型与云端模型下的差异；
- 外发数据量（用 Ollama 时应为零）。

做法 B（与「聊天框 + 手工粘贴」对比）：

- 人工搬运次数：把 agent 输出复制回工作文件的次数，目标降到 0；
- 端到端耗时与等待时间占比（人发出请求到看见改动落到自己屏幕的时间）；
- agent 编辑的接受率：被保留 vs 被回退/重写的改动比例；
- 敏感字段（价格、日期、承诺）是否 100% 走「建议—人工接受」，记录越权改动次数；
- 权限收敛情况：为每个 agent 配置对象级权限后，是否仍出现不该改的对象被改；
- 记忆可用性：打开 Markdown 记忆文件夹，能否读懂并手工修正 agent 的既有认知；
- 安全底线：在未加认证网关前确认服务仅监听 localhost。

试多久与上线门槛：

- 做法 A：原文给的最小试用是半天内。若上述指标相比基线没有明显下降，就不必引入。
- 做法 B：用一件真实小任务跑一轮（材料未给固定时长，按任务本身长度为准）。只有当「人工搬运次数 / 耗时与等待 / 接受率 / 敏感字段确认」这 4 项相对现有流程有可见改善，且权限与安全两项无事故时，才考虑扩大范围；扩大前必须先补认证与网络暴露方案。

## 常见坑

做法 A：

- CLI 不随 app 安装，必须在仓库 checkout 里执行；换别的目录调用会失败。
- 构建未签名：Windows 首次运行选 More info → Run anyway，macOS 右键 Open。
- `update_node` 是浅合并，删属性要显式写 `null`，不是省略该字段。
- `add_node` 省略 `id`/`order` 会自动生成；但 `update_node`/`remove_node` 需要确切的 `id`，所以改之前先 `describe`。
- 浏览器里用 Ollama 需给 Ollama 设 `OLLAMA_ORIGINS`；Claude Code CLI 后端仅桌面应用可用。
- 数据边界：只有用 assistant 时才外发——发送的是该图纸的 JSON 加当前选择（可选不带）；导入的图片默认不发，除非 assistant 主动要求看；API key 明文存在本机、只发给所选 provider；不用 assistant 时全离线。
- 文件格式只承诺「从 1.0 起保持可读」，当前仍在变动，别当长期稳定的归档格式。
- `validate` 通过只说明文档合法，不说明内容符合你的意图。

做法 B：

- 没有账号体系：任何能访问服务器的人都能用任意名字加入。默认只监听 localhost，对外开放前必须先读 `docs/security.md` 并自建认证网关。
- 默认是「每服务器一个 Docker 桌面」，多桌面要 E2B key；语音要 ElevenLabs 或 OpenAI 的 speech key，且其中一个语音模型（LiveKit end-of-turn）适用 LiveKit Model License 而非 MIT。
- 把 agent 拉进房间不等于有了权限闸门：需要自己按「每个 agent、每个对象」配权限，并把价格、日期、承诺类字段设成建议—人工确认。本次材料只有 README，`docs/agents.md`、`docs/security.md`、`docs/architecture.md` 未提供，权限模型、MCP 接入细节、记忆文件结构无法核实，动手前先读仓库里的这几份文档。
- 成熟度：v0.2.0、首次公开发布、大量代码由 Claude Code 写成，star 数 34，社区验证有限；别当成可直接采用的团队基础设施。
- 性能数字是作者自测：Apple M3 单机、真实客户端/真实 Yjs 更新/真实 Chrome，非第三方复现，不要当作容量承诺。

两者共同：

- 「操作合法」不等于「结果有用」。A 的 `validate`、B 的「建议—确认」都只保证边界，不保证内容符合意图；内容质量仍要靠人抽检。

## 证据与来源

做法 A 的依据是 OpenCalque 仓库（laurent512/opencalque）的 README，本次材料仅此一份。可直接照做的证据：CLI 全部子命令与参数（new/apply/describe/validate/schema/pdf/svg/dxf/import）；operation 的 JSON 结构与语义（省略时自动生成 id/order、浅合并、null 删属性、整批原子校验）；从代码调用 `applyOps` 的签名，以及文档不可变、返回新文档的行为；assistant 的四种 provider 与隐私行为；文件格式的 JSON 结构与 node 类型清单；仓库自述状态为 1.0 release candidate，有单元测试（Vitest）与浏览器测试（Playwright）；README 明确把 `describe` 的输出称为「good context for an AI agent」。

做法 B 的依据是 MemoAir-labs/Airlink 的 README。可直接照做的证据：quickstart（`npm install`、`cp .env.example .env`、`docker compose up -d`、`npm run dev` → `http://localhost:3030`）；SDK 脚手架命令；bench 脚本命令；安全前提（默认只监听 localhost、自建认证网关）；接入方式清单（本地 CLI、多家模型 API、MCP）；按「每个 agent、每个对象」的权限与「建议—确认」流程的描述；agent 记忆为可读、可版本管理的纯 Markdown 文件夹。

做法 B 给出的数据（作者自测，Apple M3 单机，真实客户端、真实 Yjs 更新、真实 Chrome）：按键到其他参与者 p50 2 ms / p99 10 ms；agent 编辑到人看到 p50 42 ms / p99 61 ms；50 房间 × 10 客户端、约 2,500 updates/s 时 p50 1–2 ms、p99 9–48 ms；10,000 条更新的房间冷启动 61 ms；共享浏览器滚动到新像素 127 ms；首页另标称 p99 按键 10 ms、agent 编辑 42 ms、单台笔记本 500 个在线客户端。以上均为单机自测，非第三方复现。

属作者主张、未见数据：A 的 Figma-like 优于 CAD-like、非破坏性编辑、组件一处改处处改、扩展「安装即安全」；A 的不同模型效果对比与 AI 生成质量评测；B 的「agent 进入工作本身」「人机看同一状态」的价值判断、与 computer-use agent 的对比（每步数秒 vs 42 ms）、以及任何用户案例、前后对比或业务收益数据；「批量/CI 式产出」原文未给具体做法，只是从示例文件由脚本生成推出的可能。

成熟度与材料局限：A 为 1.0 RC，构建未签名，文件格式只承诺从 1.0 起可读；B 为 v0.2.0，首次公开发布，无账号体系，单服务器一个 Docker 桌面，34 star，本次仅有 README，`docs/agents.md`、`docs/security.md`、`docs/architecture.md` 等未提供。两者均无「工作结果是否改善」的评测、issue 记录或第三方复现。

## 依据的调研

- [laurent512/opencalque](../research/radar/2026-10-14/3013-laurent512-opencalque.md)：值得一试，可以小范围试：把「无头核心 + 纯 JSON 操作 + 本地 CLI（new/apply/describe/validate）+ 整批原子校验 + 单次撤销」当成给 AI 代理设计操作接口的范式，并可直接用 Claude Code CLI 或本地 Ollama 驱动；理由是原文给出了可复制的命令、operation 格式和校验兜底，但缺少效果数据且领域限于建筑绘图。
- [MemoAir-labs/Airlink](../research/radar/2026-10-27/7408-memoair-labs-airlink.md)：值得一试，建议在本机或内网小范围试用：用 Docker 启动一个 AirLink 房间，把 Claude Code 或 Codex 接入共享文档、表格与浏览器，观察“智能体直接编辑同一份实时对象、敏感改动转成人工确认”能否减少提示词复制粘贴和来回等待。理由是 README 给出了可直接照做的 quickstart 和权限、记忆配置线索，但项目仅 v0.2.0、无账号体系、单机单桌面，尚不足以直接采用。
