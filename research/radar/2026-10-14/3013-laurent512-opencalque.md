# laurent512/opencalque

- 结论：**值得一试**。可以小范围试：把「无头核心 + 纯 JSON 操作 + 本地 CLI（new/apply/describe/validate）+ 整批原子校验 + 单次撤销」当成给 AI 代理设计操作接口的范式，并可直接用 Claude Code CLI 或本地 Ollama 驱动；理由是原文给出了可复制的命令、operation 格式和校验兜底，但缺少效果数据且领域限于建筑绘图。
- 原文：https://github.com/laurent512/opencalque
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T20:48:14.770Z

## 是什么

OpenCalque 是一个 MIT 许可的开源 2D 建筑编辑器（楼平面/布局），同一套代码同时产出桌面应用和网页应用，界面偏 Figma 而非 CAD。它有三个和 AI 使用直接相关的设计：内核与界面分离（`@opencalque/core` 是 headless 文档模型，编辑器只是它的一个客户端）、文档只通过纯 JSON 的 operation 修改（UI、撤销、CLI、扩展都走 `applyOps`）、以及一个本地 CLI（`new/apply/describe/validate/pdf/svg/dxf/import/schema`）。README 明确把 `describe` 的输出称为 "good context for an AI agent"，并内置一个可用 Claude、本机 Claude Code CLI、本地 Ollama 或任意 OpenAI 兼容服务驱动的 assistant，按自然语言改图。

## 具体做法

1. 起环境。前提：Node ≥ 22、pnpm ≥ 9。

```sh
git clone https://github.com/laurent512/opencalque.git
cd opencalque
pnpm install
pnpm dev          # 桌面应用（热重载）；pnpm dev:web 为浏览器版
```

不装环境也可用网页版 opencalque.com，或从 releases 页下载安装包（构建未签名，首次运行需在 Windows 选 More info → Run anyway，macOS 右键 Open）。

2. 用 CLI 走一遍最小闭环。前提：CLI 不随 app 安装，必须在上一步的仓库 checkout 里执行。

```sh
pnpm opencalque new plan.opencalque "My plan"                   # 新文档固定自带 page_1 和 layer_1
pnpm opencalque describe plan.opencalque                         # JSON 摘要，作为给 AI 代理的上下文
pnpm opencalque apply plan.opencalque examples/studio.ops.json   # 应用一个 operation JSON 数组
pnpm opencalque validate plan.opencalque                         # 有问题则退出码 1 并列出
pnpm opencalque schema --out schema                              # 导出文档与 operation 的 JSON Schema
pnpm opencalque pdf plan.opencalque --out plan.pdf               # 每张图纸一页，真实尺寸与比例
```

3. 让代理按 operation 批次改文档。把 `describe` 的输出（连同 `schema`）喂给模型，要求它只输出 operation 的 JSON 数组，再用 `apply` 落盘。operation 长这样：

```json
[
  { "op": "add_layer", "layer": { "id": "furniture", "name": "Furniture", "color": "#2563eb" } },
  { "op": "add_node", "node": { "type": "wall", "parent": "page_1", "a": { "x": 0, "y": 0 }, "b": { "x": 6000, "y": 0 }, "thickness": 200 } },
  { "op": "update_node", "id": "n_1", "patch": { "thickness": 300, "name": null } },
  { "op": "remove_node", "id": "n_1" }
]
```

要点：`add_node` 省略时会自动生成 `id` 和 `order`；`update_node` 是浅合并，`null` 删属性；整批是 all-or-nothing 且每个结果都校验，所以脚本或模型无法把文档改坏。单条 operation 也可以小到一条墙：

```json
{ "op": "add_node", "node": { "type": "wall", "parent": "page_1", "a": { "x": 0, "y": 0 }, "b": { "x": 6000, "y": 0 }, "thickness": 200 } }
```

4. 在编辑器里配 assistant。Preferences 里四选一：Claude（Anthropic API key）；本机安装的 Claude Code CLI（仅桌面应用，用已登录账号，无需 API key）；本地 Ollama（桌面应用开箱可用，浏览器里需给 Ollama 设 `OLLAMA_ORIGINS`）；任意支持 tool calling 的 OpenAI chat-completions 服务。

5. 用自然语言下指令并控制会话。右侧 Assistant 面板 `Ctrl+J`，例如 "draw a 5 × 4 m room with a door on the bottom wall"；整条请求用一次 `Ctrl+Z` 撤销；`/new` 新会话、`/resume` 恢复、`/model` 换模型、`/clear` 清空；`Ctrl+V` 或回形针贴草图。

6. 从代码里调用同一套模型。

```ts
import { applyOps, createDocument, serializeDocument } from '@opencalque/core'

const doc = applyOps(createDocument('Plan'), [
  { op: 'add_node', node: { type: 'rect', parent: 'page_1', x: 0, y: 0, width: 1200, height: 700 } },
])
```

`applyOps` 返回新文档（文档不可变）。

7. 数据边界。只有在用 assistant 时才外发：发送的是该图纸的 JSON 加当前选择（可选不带）；导入的图片默认不发，除非 assistant 主动要求看；桌面应用在连非本机服务前会问一次；API key 明文存在本机、只发给所选 provider；不用 assistant 时全离线。

## 对应的研究问题

- 能力发现：README 把「按描述生成/修改图纸」算作可交给模型的活，示例图纸 `examples/apartment.opencalque` 自称由一个 100 行脚本通过编辑器同一套 operation 生成，`examples/studio.opencalque` 由 `examples/studio.ops.json` 经 CLI 生成。即：结构化产出（画平面、批量加对象、导出）可交给脚本或代理，人只做手工微调。
- 任务匹配：适合交给模型的是能用 JSON operation 精确表达的任务；入口有两条——编辑器内 assistant（自然语言）和 CLI（`apply`）。后端给了四种可选（Claude API、Claude Code CLI、Ollama、任意 OpenAI 兼容），本地 Ollama 对应「数据不出本机」，Claude Code CLI 对应「复用已登录账号、不另配 key」。README 没有给出不同模型效果的对比。
- 条件供给：要让代理干成这件事，需要给的是（a）`describe` 的 JSON 摘要作为上下文，（b）可执行 `apply` 的 CLI 通路，（c）`schema` 导出的 JSON Schema，（d）文件写权限，（e）反馈与兜底——批次原子校验、`validate` 退出码、单次撤销。这正好是一份「给代理留操作接口 + 校验闸门」的可抄样板。
- 主动推进：README 没写时间/事件/状态触发的常驻流程；只能从「示例文件由脚本生成」推出批量/CI 式产出的可能，原文未给具体做法，不作结论。
- 效果验证：`validate` 有问题时退出 1 并列出；`apply` 整批校验保证不产生非法文档；PDF 导出为真实比例（原文举例：A3 1:50，一米量出来是 20 mm）可用来核几何。没有关于「AI 生成质量」的评测或对比数据。

## 与已有做法的关系

清单条目：Claude Code（adopt）、Paperclip（study）、Cursor（watch）。README 明确支持 "Claude through the Claude Code CLI installed on your computer, using the account it is signed in to"，桌面版专用、无需 API key、可在 Preferences 切换——这是把 Claude Code 当作其他应用可复用的本地代理后端的一个具体配置点，可与清单中的 Claude Code 条目互参。Paperclip 与 Cursor 在原文中未被提及。

## 证据与局限

证据（可直接照做）：CLI 全部子命令与参数、operation 的 JSON 结构与语义（自动生成 id/order、浅合并、null 删属性、整批原子校验）、从代码调用 `applyOps` 的签名、assistant 的四种 provider 与隐私行为、文件格式的 JSON 结构与 node 类型清单；仓库自述状态为 1.0 release candidate，有单元测试（Vitest）与浏览器测试（Playwright）。属作者主张、未见数据：Figma-like 优于 CAD-like、非破坏性编辑、组件一处改处处改、扩展「安装即安全」等。适用条件：这是建筑制图领域的工具，通用性来自类比；assistant 需自备 provider 或本地模型；构建未签名；文件格式只承诺「从 1.0 起保持可读」，当前仍在变动；本次材料仅为仓库 README，没有 issue、评测或第三方复现记录。

## 怎么试、怎么验证

最小试用（半天内）：

1. `git clone` + `pnpm install`，`pnpm opencalque new` 建空文件；手写一个两三条 wall/rect 的 ops.json，`apply` 后 `describe` 看是否落地，`validate` 应无输出、退出 0。
2. 配 Ollama（或 Claude Code CLI）为 provider，在 Assistant 里发「画一个 5 × 4 m 房间，下墙开门」，再 `Ctrl+Z`，确认一次撤销能整体回退且文档仍然合法（`validate` 通过）。
3. 把 `describe` 的输出直接喂给你平时用的代理（如 Claude Code），让它产出 ops JSON，`apply` 后数一下需要人工修正几处。

判断有没有改善的指标：`apply` 失败率与 `validate` 报错次数；从提出需求到得到可用图纸的往返轮数；需要人工改动或撤销重建的操作数；同一请求在本地模型与云端模型下的差异；外发数据量（用 Ollama 时应为零）。若这几项相比「手工画」或「纯对话式让模型给代码」没有明显下降，就不必引入。
