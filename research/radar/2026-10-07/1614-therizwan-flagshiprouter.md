# theRizwan/FlagshipRouter

- 结论：**值得一试**。可以小范围试：在本地用 FlagshipRouter 起一个 OpenAI 兼容网关，把 Claude Code、Cline 等已在用的编程工具统一接到一个模型入口、按任务切换模型；但原文只是接线层的 README，没有质量或收益数据，且有已知测试失败和默认密码风险，先局部验证再决定是否写进手册。
- 原文：https://github.com/theRizwan/FlagshipRouter
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T17:34:35.718Z

## 是什么

FlagshipRouter 是一个本地运行的 AI 网关，对外暴露一个 OpenAI 兼容端点（默认 `http://localhost:20128/v1`），把 Claude Code、Codex、Cursor、Cline、OpenCode 等编程工具接到多家提供免费额度的模型供应商（README 列举：Kiro、OpenCode Free、OpenRouter 免费模型、NVIDIA NIM、Groq、Cloudflare Workers AI、Ollama、自托管服务等）。

主要机制：

- 只有一个模型入口，但有一个 **Models** 页面把所有免费供应商的模型汇成一张可搜索的表，带 ready/connect 状态和一键测试。
- **CLI Tools** 页面可以代为写入各个工具的配置，模型在工具里显示为 `flagshiprouter/<model>`。
- 品牌名、CLI 命令、数据目录、模型前缀、供应商策略集中在 `brand.json` 一个文件里改。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：安装 Node.js 20.9 或更高（README 建议 22）。克隆并启动：

```bash
git clone https://github.com/theRizwan/FlagshipRouter.git
cd FlagshipRouter
npm run launch
```

`npm run launch` 会安装依赖、构建应用（首次要几分钟）、启动 CLI。服务跑在端口 `20128`，浏览器自动打开面板，终端保留一个小菜单（打开浏览器 UI、终端 UI、隐藏到托盘、退出）。后续启动只需几秒，且在源码或 `brand.json` 变化时自动重建。

2. 需要传 CLI 参数时，写在 `--` 之后：

```bash
npm run launch -- --host 127.0.0.1
npm run launch -- -p 20130
npm run launch -- --no-browser
```

3. （可选）想在任何目录直接用 `flagshiprouter` 命令，先链接一次 CLI 包：

```bash
cd cli && npm link
```

4. （可选）开发模式带热重载：

```bash
npx next dev --port 20128
```

5. 安全前提：面板默认密码是 `123456`。README 明确要求，在把网关暴露到 localhost 之外以前，先去 **Settings** 改掉它。

6. 把编程工具接上（前提：服务已在跑）：
   1. 打开 **Endpoint & Key**，创建一个 API key。
   2. 打开 **Models**，选一个标为 **Ready** 的模型（OpenCode Free 的模型不需要注册即可用），或先连接某个供应商以解锁更多模型。
   3. 把工具指向 `http://localhost:20128/v1` 并填入该 key；或直接用 **CLI Tools** 页面为 Claude Code、Codex、OpenCode、Cline、Copilot 等写入配置。模型在这些工具里显示为 `flagshiprouter/<model>`。

   README 给出的连通性验证方式（注意示例模型名 `gpt-6-astra` 来自 README，需换成你实际 Ready 的模型）：

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-6-astra", "messages": [{"role": "user", "content": "Hello"}]}'
```

7. 改品牌与命名：编辑仓库根目录的 `brand.json`。README 给出的字段含义：

| 字段 | 控制什么 |
| --- | --- |
| `name` | 面板、终端 UI、托盘、页面标题、翻译里的产品名 |
| `slug` | npm 包名、CLI 命令、数据目录（`~/.<slug>`）、请求头、MITM 证书名 |
| `modelPrefix` | 写进 CLI 工具配置的供应商前缀，模型显示为 `<modelPrefix>/<model>` |
| `tagline`、`description` | 页面标题、web app manifest |
| `repository`、`branch` | 链接、changelog 和 agent-skill URL |
| `updateCheck` | npm 更新提示（包还没以该 `slug` 发布前保持 `false`） |
| `providers` | 免费供应商策略（见下） |

改完 `brand.json` 后运行：

```bash
npm run brand:sync
```

它更新两个 `package.json`（包名、CLI bin），其余都在运行时或构建时读取 `brand.json`。

8. 免费供应商策略（写在 `brand.json`，README 原样给出）：

```json
"providers": {
  "freeOnly": true,
  "categories": ["free", "freeTier"],
  "includeHasFree": true,
  "include": [],
  "exclude": ["antigravity", "gemini", "gemini-cli"],
  "customEndpoints": false
}
```

规则：某个供应商可用，当它的注册表条目（`open-sse/providers/registry/<id>.js`）有列出的 `category`，或者被标为 `hasFree` 且 `includeHasFree` 为开。`include` 和 `exclude` 填 provider id。该策略在面板、管理 API、连接存储和路由时都被强制执行。`customEndpoints` 打开后允许用户自定义 OpenAI/Anthropic 兼容端点；把 `freeOnly` 设为 `false` 会恢复完整的上游供应商列表。

9. 跑测试（README 原样命令；注意套件本身带有已知失败）：

```bash
npm install --prefix /tmp/vitest-runner --legacy-peer-deps vitest@4
ln -sfn /tmp/vitest-runner/node_modules tests/node_modules
cd tests && npx vitest run
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：弱相关。它本身不新增模型能力，但 Models 页面把多家免费供应商的模型汇成一张可搜索表，附带 ready/connect 状态和一键测试，能让人发现自己原本不知道可用的免费模型。README 的面板列表里还提到 Media Models 页面覆盖 embedding、image、video、speech、transcription、web fetch & search，说明网关不止聊天模型，但这些页面 README 没有给用法。
2. **任务匹配**：核心相关。它把“工具 ↔ 模型”配对从每个工具各自配置变成一处统一入口：同一端点接多个编程工具，模型在工具里以 `flagshiprouter/<model>` 呈现，便于按任务切换模型；CLI Tools 页面可自动为不同工具写配置。
3. **条件供给**：相关且具体。需要提供：跑起来的本地服务（端口 20128）、一个 API key、各工具的 base URL 与 key、供应商策略（`freeOnly`/`categories`/`include`/`exclude`/`customEndpoints`）、以及先在 Settings 改掉的默认密码。
4. **主动推进**：无依据。README 只提到“源码或 `brand.json` 变化时自动重建”，那是构建行为，不是由时间/事件/状态触发的工作流。
5. **效果验证**：很有限。只有 Models 页面的一键测试和 README 里那条 curl，验证的是“模型能不能连通”，不是“结果好不好”。仓库有 Vitest 测试套件（`tests/unit/brand-policy.test.js` 覆盖品牌层），但 README 自己说套件带已知失败。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：README 明确把 Claude Code 列为可接入工具，CLI Tools 页面可为它写入配置；这是给已采用的工具换/加模型入口的一条路径。
- **Cline（watch）、Cursor（watch）、OpenCode（watch）**：README 明确列出 Cline 和 OpenCode 可直接接入；Cursor 只在开头的工具名单里出现，未在 CLI Tools 的示例清单中复述。它可以在这些工具还处于试验阶段时，降低“逐个配模型”的成本。
- **Agent skills（adopt）**：面板屏幕列表里有 Agent Skills 页，`brand.json` 的 `repository`/`branch` 控制 agent-skill URL，但 README 没有展开用法，无法据此提炼步骤。
- 总体：FlagshipRouter 是清单里这些工具之上的**粘合层**——把多个工具接到一个模型入口，而不是替代其中任何一个。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **数据**：只有仓库元信息 37 stars。没有性能、成本、质量或用户案例数据。
- **只是作者主张**："Free AI models for every coding tool"、一键测试、模型统一命名带来便利等，均无对照实验或量化结果支持。
- **已知缺陷（README 自陈）**：测试套件包含已知失败——live-provider 测试、缺失的 `cloud/` worker、对时序敏感的 DB 测试；README 建议与上一个 commit 的运行结果对比，而不是期待全绿。引擎测试还在 `tests/setup/providerPolicy.js` 里把 free-only 策略关掉。
- **安全条件**：面板默认密码 `123456`，默认监听端口 `20128`；README 明确说暴露到 localhost 之外前必须改密码、并要求可指定 `--host 127.0.0.1` 只本地监听。
- **适用条件**：依赖免费的第三方供应商及其额度政策，可用性和限流会随上游变化；README 中的示例模型名（如 `gpt-6-astra`）不能当作真实可用模型。需要 Node.js 20.9+。
- **材料局限**：本次输入只有仓库 README（source_note 也标注“依据仓库 README”），没有实际跑过，所有步骤均为未经验证的转述。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**（半天以内，全部本地）：

1. clone + `npm run launch`，只以 `--host 127.0.0.1` 启动，先去 Settings 把密码从 `123456` 改掉。
2. 在 Models 里挑一个 OpenCode Free 的免注册模型，用 README 的 curl 打通一条请求。
3. 用 CLI Tools 只给一个当前已在用的工具（例如 Claude Code）写配置，并记录原配置以便回滚。
4. 拿一个真实的小任务，分别在原配置和走网关的配置下各跑一遍。

**判断是否有改善的指标**：

- 首次跑通耗时：从 clone 到第一条成功请求的分钟数（网关自身是否好装好用）。
- 任务层面：同一小任务的成功率、需要人返工的次数、token 或费用消耗，走网关 vs 原配置的对比。
- 切换成本：按任务换模型是否真的生效（看工具里是否显示 `flagshiprouter/<model>`），以及换一次要几步。
- 稳定性：Console Log 里的失败请求数、触发限流/额度耗尽的次数（面板提供 Usage 与 Quota 页 `/dashboard/usage`、`/dashboard/quota`）。
- 副作用：原工具有没有出现行为变化或配置被覆盖；能否一条命令回滚（删掉 CLI Tools 写入的配置）。
- 只要出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”，就应停止推广，把结论降为 study。
