# 给 AI 代理一套改不坏、能整体回退的操作接口

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当 AI 代理要直接改文档、图纸这类结构化文件时，怎么把它的动作收敛到可校验的结构化操作上，做到改不坏、一次撤销整体回退。
> 先试这一步：clone OpenCalque 仓库后，用 `pnpm opencalque new` 建一个空文档，手写一个两三条 operation 的 ops.json，跑通 apply → describe → validate 这个最小闭环。
> 最近修订：2026-10-14

## 解决什么问题

让 AI 代理直接改文档、图纸这类结构化文件时，风险通常有两类：一是它产出的内容不合法、把文件改坏；二是改完之后无法整体回退，只能人工逐条修。OpenCalque 给出的样板是把「代理能做什么」收敛到一套纯 JSON operation 上，再由本地 CLI 执行，并且整批操作 all-or-nothing、每条结果都校验、整条请求用一次撤销回退。这套「无头核心 + 纯 JSON 操作 + 本地 CLI（new/apply/describe/validate）+ 整批原子校验 + 单次撤销」的结构，可以当成给 AI 代理设计操作接口的范式来抄。

需要说明的是：原文给出的是建筑制图工具的具体实现，通用性来自类比；且原文没有 AI 生成质量的评测数据。

## 适用与不适用

适用：

- 能用 JSON operation 精确表达的任务。README 把「按描述生成/修改图纸」算作可交给模型的活。
- 结构化产出（画平面、批量加对象、导出）交给脚本或代理、人只做手工微调。示例图纸 `examples/apartment.opencalque` 自称由一个 100 行脚本通过编辑器同一套 operation 生成，`examples/studio.opencalque` 由 `examples/studio.ops.json` 经 CLI 生成。
- 需要数据不出本机时（本地 Ollama），或想复用已登录账号、不另配 key（桌面版 Claude Code CLI）。

不适用 / 局限：

- 这是建筑制图领域的工具，领域外的通用性只是类比。
- 编辑器内 assistant 需要自备 provider 或本地模型。
- 构建未签名；文件格式只承诺「从 1.0 起保持可读」，当前仍在变动。
- 原文没有不同模型的效果对比，也没有 AI 生成质量的评测或第三方复现记录。
- README 没写时间/事件/状态触发的常驻流程；「批量/CI 式产出」只能从「示例文件由脚本生成」推出可能，原文未给具体做法，不作结论。

## 前置条件

- Node ≥ 22、pnpm ≥ 9；git。
- 要用编辑器内 assistant，需四选一 provider 之一：
  - Claude（Anthropic API key）；
  - 本机安装的 Claude Code CLI（仅桌面应用，用已登录账号，无需 API key）；
  - 本地 Ollama（桌面应用开箱可用；浏览器里需给 Ollama 设 `OLLAMA_ORIGINS`）；
  - 任意支持 tool calling 的 OpenAI chat-completions 服务。
- CLI 不随 app 安装，必须在上一步的仓库 checkout 里执行。
- 桌面应用在连非本机服务前会问一次；构建未签名，首次运行需放行（Windows：More info → Run anyway；macOS：右键 Open）。

## 操作步骤

### 做法 A：编辑器内 assistant（自然语言）

适合手工微调、快速起步。

1. 起环境。前提：Node ≥ 22、pnpm ≥ 9。

```sh
git clone https://github.com/laurent512/opencalque.git
cd opencalque
pnpm install
pnpm dev          # 桌面应用（热重载）；pnpm dev:web 为浏览器版
```

不装环境也可用网页版 opencalque.com，或从 releases 页下载安装包。

2. 在 Preferences 里配 assistant（四选一，见前置条件）。

3. 用自然语言下指令并控制会话。右侧 Assistant 面板 `Ctrl+J`，例如 `draw a 5 × 4 m room with a door on the bottom wall`；整条请求用一次 `Ctrl+Z` 撤销；`/new` 新会话、`/resume` 恢复、`/model` 换模型、`/clear` 清空；`Ctrl+V` 或回形针贴草图。

预期结果：指令落地成文档改动；一次撤销能把整条请求整体回退。

### 做法 B：CLI + 让代理产出 operation JSON（脚本/批量）

适合需要精确控制、由脚本或代理批量产出的改动。做法 A 与 B 共用同一套 operation 和 `applyOps`，可以混用。

1. 用 CLI 走一遍最小闭环。前提：CLI 不随 app 安装，必须在仓库 checkout 里执行。

```sh
pnpm opencalque new plan.opencalque "My plan"                   # 新文档固定自带 page_1 和 layer_1
pnpm opencalque describe plan.opencalque                         # JSON 摘要，作为给 AI 代理的上下文
pnpm opencalque apply plan.opencalque examples/studio.ops.json   # 应用一个 operation JSON 数组
pnpm opencalque validate plan.opencalque                         # 有问题则退出码 1 并列出
pnpm opencalque schema --out schema                              # 导出文档与 operation 的 JSON Schema
pnpm opencalque pdf plan.opencalque --out plan.pdf               # 每张图纸一页，真实尺寸与比例
```

预期结果：`new` 建出带 `page_1`/`layer_1` 的空文档；`describe` 打印 JSON 摘要；`apply` 成功后 `describe` 里能看到改动；`validate` 无输出、退出 0。

2. 让代理按 operation 批次改文档。把 `describe` 的输出（连同 `schema`）喂给模型，要求它只输出 operation 的 JSON 数组，再用 `apply` 落盘。

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

预期结果：合法批次整体落盘；不合法批次整体不落盘，`apply` 报错，文档保持原样。

3. 从代码里调用同一套模型（可选）。`applyOps` 返回新文档（文档不可变）。

```ts
import { applyOps, createDocument, serializeDocument } from '@opencalque/core'

const doc = applyOps(createDocument('Plan'), [
  { op: 'add_node', node: { type: 'rect', parent: 'page_1', x: 0, y: 0, width: 1200, height: 700 } },
])
```

怎么选：需要自然语言交互、手工调整、快速验证想法，走做法 A；需要精确、可重复、由脚本或代理批量产出的改动，走做法 B。两者共用同一 operation 与 `applyOps`，可以混用（assistant 改完再用 CLI `validate`/`pdf` 核几何）。

## 怎么判断变好了

最小试用（半天内）：

1. `git clone` + `pnpm install`，`pnpm opencalque new` 建空文件；手写一个两三条 wall/rect 的 ops.json，`apply` 后 `describe` 看是否落地，`validate` 应无输出、退出 0。
2. 配 Ollama（或 Claude Code CLI）为 provider，在 Assistant 里发「画一个 5 × 4 m 房间，下墙开门」，再 `Ctrl+Z`，确认一次撤销能整体回退且文档仍然合法（`validate` 通过）。
3. 把 `describe` 的输出直接喂给你平时用的代理（如 Claude Code），让它产出 ops JSON，`apply` 后数一下需要人工修正几处。

可观察的指标（与「手工画」或「纯对话式让模型给代码」对比）：

- `apply` 失败率与 `validate` 报错次数；
- 从提出需求到得到可用图纸的往返轮数；
- 需要人工改动或撤销重建的操作数；
- 同一请求在本地模型与云端模型下的差异；
- 外发数据量（用 Ollama 时应为零）。

若这几项相比基线没有明显下降，就不必引入。试多久：原文给的最小试用是半天内。

## 常见坑

- CLI 不随 app 安装，必须在仓库 checkout 里执行；换别的目录调用会失败。
- 构建未签名：Windows 首次运行选 More info → Run anyway，macOS 右键 Open。
- `update_node` 是浅合并，删属性要显式写 `null`，不是省略该字段。
- `add_node` 省略 `id`/`order` 会自动生成；但 `update_node`/`remove_node` 需要确切的 `id`，所以改之前先 `describe`。
- 浏览器里用 Ollama 需给 Ollama 设 `OLLAMA_ORIGINS`。
- Claude Code CLI 后端仅桌面应用可用。
- 数据边界：只有用 assistant 时才外发——发送的是该图纸的 JSON 加当前选择（可选不带）；导入的图片默认不发，除非 assistant 主动要求看；API key 明文存在本机、只发给所选 provider；不用 assistant 时全离线。
- 文件格式只承诺「从 1.0 起保持可读」，当前仍在变动，别把它当长期稳定的归档格式。
- 没有 AI 生成质量的评测数据：`validate` 通过只说明文档合法，不说明内容符合你的意图。

## 证据与来源

本节依据的调研是 OpenCalque 仓库（laurent512/opencalque）的 README，本次材料仅此一份。

可直接照做的证据：

- CLI 全部子命令与参数（new/apply/describe/validate/schema/pdf/svg/dxf/import）；
- operation 的 JSON 结构与语义（省略时自动生成 id/order、浅合并、null 删属性、整批原子校验）；
- 从代码调用 `applyOps` 的签名，以及文档不可变、返回新文档的行为；
- assistant 的四种 provider 与隐私行为；
- 文件格式的 JSON 结构与 node 类型清单；
- 仓库自述状态为 1.0 release candidate，有单元测试（Vitest）与浏览器测试（Playwright）；
- README 明确把 `describe` 的输出称为 "good context for an AI agent"。

属作者主张、未见数据：

- Figma-like 优于 CAD-like、非破坏性编辑、组件一处改处处改、扩展「安装即安全」；
- 不同模型之间的效果对比、AI 生成质量的评测，均无数据；
- 「批量/CI 式产出」原文未给具体做法，只是从示例文件由脚本生成推出的可能。

局限：适用条件为建筑制图领域，通用性来自类比；assistant 需自备 provider 或本地模型；构建未签名；文件格式只承诺从 1.0 起保持可读；本次材料没有 issue、评测或第三方复现记录。

## 依据的调研

- [laurent512/opencalque](../research/radar/2026-10-14/3013-laurent512-opencalque.md)：值得一试，可以小范围试：把「无头核心 + 纯 JSON 操作 + 本地 CLI（new/apply/describe/validate）+ 整批原子校验 + 单次撤销」当成给 AI 代理设计操作接口的范式，并可直接用 Claude Code CLI 或本地 Ollama 驱动；理由是原文给出了可复制的命令、operation 格式和校验兜底，但缺少效果数据且领域限于建筑绘图。
