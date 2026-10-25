# Show HN: Farol – A risk map of a pull request for the person who approves it

- 结论：**值得一试**。在一个真实仓库上用纯 CLI 模式试跑 farol（不改 CI、不阻塞合并），把它给出的 verdict/score 与你人工判断的风险做对照，跑通后再接成 GitHub Action；理由是原文给出了可直接照抄的配置、命令和三语言 CI 接法，属于确定性静态分析、定位清晰（AI 评审之后的风险聚焦层），但评分阈值只在极少数仓库上校准过，必须先用自己的历史验证。
- 原文：https://github.com/winnin/farol
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T18:41:37.986Z

## 是什么

farol 是一个 MIT 许可的开源 CLI + GitHub Action，位置很明确：在 AI 代码评审之后、人点下 Merge 之前。它不评论 diff 里的某一行，而是回答审批者真正要判断的问题——**这次合并有多危险，危险集中在哪里**。

做法是用静态分析（TypeScript 编译器的类型检查器、`go list` + `go/types`、Python `ast`）在 base 和 head 两棵代码树上建立「哪个声明用了哪个声明」的图，再把 diff 里的改动回溯到所有会执行到它的入口点（页面、API 操作、RPC 方法、job、脚本），最后综合触达范围、diff 覆盖率、安全发现、契约破坏、依赖变更，给出 0–100 风险分和三档结论（`fast track` / `quick review` / `careful review`），并列出先读哪些文件、手工测哪些页面、哪些契约变更要找客户端确认。

三个关键设计：

- `analyze` **从不执行被分析的代码、从不上网**（只有 `comment` 调 GitHub API、`usage` 调 Datadog API 会联网）。
- **确定性**：同一 PR 每次给同样的报告，每条结论都带调用链；读不懂的地方标 `unknown` 并要求 careful review，而不是因为没看懂就判为安全（fail closed）。
- **Shadow mode**：只提示，从不批准、从不 request changes、从不 fail check。

## 具体做法

前提：Node.js 22+ 与 `git`；Go 项目另需 `go`，Python 项目另需 `python3` 3.11+。无需安装，用 `npx` 即可。

**1. 在仓库根目录写 `farol.config.json`**，先只写一行，按技术栈选：

```json
{ "routes": { "file": "src/routes.tsx" } }
```

其余常见组合（原表）：

| 项目类型 | 配置 |
|---|---|
| React + React Router | `{ "routes": { "file": "src/routes.tsx" } }`（构建路由表的文件） |
| Next.js（Pages 或 App Router） | `{ "routes": { "adapter": "next" } }` |
| React + TanStack Router | `{ "routes": { "adapter": "tanstack-router", "dir": "src/routes" } }` |
| TypeScript API（GraphQL / REST） | `{ "surface": "backend" }` |
| Go 服务 | `{ "language": "go", "surface": "backend" }` |
| Python 服务（FastAPI/Flask/Django/Celery…） | `{ "language": "python", "surface": "backend" }` |

前提与坑：Next.js 的 `pages/`、`app/` 会在项目根或 `src/` 下自动找，在别处要设 `"dir"`；monorepo 里若 tsconfig `extends` 了 workspace 包，需先装依赖再分析。

**2. 确认它看懂了你的项目。** 这一步不能跳，否则后面所有报告都不可信。

```sh
npx @winninjs/farol routes          # 列出它识别到的页面/接口/任务/脚本
npx @winninjs/farol impact <file>   # 看哪些入口会触达某个文件
```

识别不到的构造会列在 diagnostics 里。

**3. 本地分析一个分支并打开报告。**

```sh
npx @winninjs/farol analyze --base origin/main --head HEAD --out farol.json
npx @winninjs/farol html --in farol.json --out farol.html && open farol.html   # Linux 用 xdg-open
```

完整最小示例（React Router）：

```sh
cd path/to/your/react-app
echo '{ "routes": { "file": "src/routes.tsx" } }' > farol.config.json

npx @winninjs/farol routes
git checkout my-feature-branch
npx @winninjs/farol analyze --base origin/main --head HEAD --out farol.json
npx @winninjs/farol html --in farol.json --out farol.html && open farol.html
```

**4. 把 CI 里已有的报告喂给它（不要重复跑一遍）。** 三个语言的原样命令：

TypeScript / React（Vitest 为例）：

```sh
npx vitest run --coverage.enabled --coverage.reporter=json --coverage.reportsDirectory=reports/coverage
npx eslint -f json -o reports/eslint.json <changed files>
npm audit --json > reports/audit.json                     # 或 pnpm audit --json

npx @winninjs/farol analyze --base origin/main --head HEAD \
  --coverage reports/coverage/coverage-final.json --eslint reports/eslint.json --audit reports/audit.json --out farol.json
```

配套要求：Vitest 配置里设 `coverage.include: ['src/**/*.{ts,tsx}']`，让没有测试加载的文件被报成未测试。

Go：

```sh
go test -coverpkg=./... -coverprofile=reports/cover.out ./...
golangci-lint run --output.json.path=reports/golangci.json --issues-exit-code=0 ./...   # 启用 gosec
govulncheck -json ./... > reports/govulncheck.json

npx @winninjs/farol analyze --base origin/main --head HEAD \
  --coverage reports/cover.out --eslint reports/golangci.json --audit reports/govulncheck.json --out farol.json
```

Go 的额外前提：farol 离线读模块，base 和 head 都要先 `go mod download`。

Python：

```sh
pytest --cov=src --cov-report=json:reports/coverage.json
ruff check --output-format json --extend-select S --exit-zero . > reports/ruff.json    # S = flake8-bandit
pip-audit --format json -o reports/pip-audit.json

npx @winninjs/farol analyze --base origin/main --head HEAD \
  --coverage reports/coverage.json --eslint reports/ruff.json --audit reports/pip-audit.json --out farol.json
```

没给某份报告时，报告里显示 **not verified**，而不是显示通过——这点在流程设计上很重要。

**5. 接成 GitHub Action（可选，第二周再做）。** 抄 `examples/workflow.yml`（Go 用 `examples/workflow-go.yml`，Python 用 `examples/workflow-python.yml`）到 `.github/workflows/farol.yml`，其结构是固定的三个 job 形状：

1. `tests`：跑测试、lint、audit 并保留报告。它**运行 PR 的代码**，所以不挂 secret、只有只读 token。已有测试 job 的话保留原样，只加上传步骤。
2. `farol`：在它之后跑（不论成败），读 git 和报告，**每次 push 都发一条新评论**，附打开 HTML 报告的链接，外加一份只含「上次 push 以来提交」的第二份报告。它**从不运行 PR 的代码**。
3. 草稿 PR 跳过；fork PR 不发评论（token 只读）；所有 farol 步骤都设 `continue-on-error`。

跑通后把 action 钉到 commit：`winnin/farol/action@<sha> # main as of <date>`。

**6. 按固定顺序读报告**（这是把工具变成流程的关键）：

1. **Verdict 和分数**：先看结论和「What adds to it」里的逐项扣分，带着它去看 diff。
2. **Start here**：按风险从高到低读，每个文件读完勾 **Mark as reviewed**，分数会随之下降，随时知道还剩多少风险没看。
3. **Pages / Operations**：看爆炸半径（触达 3 个没人用的后台页 ≠ 触达 checkout）。
4. **Contracts**（后端）：每条 breaking 变更确认是否有意、客户端是否已更新，勾 *checked with clients*。
5. **Security / Dependencies / Coverage**：证据层，逐条勾 *checked*。
6. **Test plan**：本地或预览环境按清单手工验证，文件被标 reviewed 的条目会显示 ✓ files reviewed，手工测试的勾仍归你。
7. **Result**：把 Markdown 记录 **Copy as Markdown** 贴回 PR，作为「看过什么」的凭据。

对未上线功能用 **Behind a feature flag** 标注入口点，只被这些入口用到的文件会移出评审范围，剩余分数才反映用户真正会撞到的东西。

**7. 第二轮评审用增量。**

```sh
npx @winninjs/farol analyze --since <sha> ...
```

评论里会自动带上这份「只含上次 push 以来提交」的报告；force-push 时从其 merge-base 算起。修完一轮只看新提交有没有做到要求、有没有顺带改别的，只有新提交触达了新地方才回看全量报告。

**8. （可选）接入 Datadog 流量与线上错误。** 只作参考信息，**从不改变分数**。

```json
{
  "datadog": {
    "env": "prod",
    "rum": { "applicationId": "<RUM application id>" },
    "apm": { "service": "orders-api", "operations": ["fastapi.request"] }
  }
}
```

```sh
DD_API_KEY=… DD_APP_KEY=… npx @winninjs/farol usage --out usage.json      # 最近 14 天
npx @winninjs/farol analyze … --usage usage.json
```

CI 里用单独的 `farol-usage` job，设 `DD_API_KEY`/`DD_APP_KEY` secret 和仓库变量 `FAROL_DATADOG=true`，一天读一次，永远不接触 PR 的代码。

**9. 用你自己的历史校准阈值。** 原文明确说分数和 verdict 阈值是启发式、只在少数仓库上查过，并给了命令：

```sh
farol calibrate
```

（完整参数见仓库 `docs/reference.md#calibrating-the-score-on-your-history`。）

**10. 非 GitHub 平台**：`analyze`、`html`、`report` 与平台无关，只有 `comment` 是 GitHub 专属；把 `npx @winninjs/farol report` 的输出用你自己平台的 API 发出去即可。monorepo 用 `--cwd` 指向子应用，路径仍相对仓库根。

## 对应的研究问题

**1. 能力发现（AI 已能做、但常没想到交给它的工作）**

原文给出了几类通常由资深评审者凭经验做、容易没想到可以工具化的活：审批前的风险分级、改动触达面追溯（改 `formatPrice` 会列出渲染它的 12 个页面，而不是「1 file changed」）、接口契约破坏检测（FastAPI 参数/响应体/Pydantic 模型、GraphQL schema、Go handler 与 gRPC 消息）、按 git blame × 文件风险加权 + CODEOWNERS 推荐评审人、把 coverage/lint/audit 报告转换成「改动行上的覆盖率与发现」、以及自动生成手工测试清单。

**2. 任务匹配（什么工作适合什么工具与协作方式）**

原文给了很清晰的切分依据，可直接搬进手册：需要*可复现、要举证链、要覆盖整个程序*的判断交给确定性静态分析；*行内语义问题*交给 LLM 评审 agent。原文自己的对照表：agent 读 diff 和能塞进 prompt 的上下文、给概率性答案、每次措辞不同；farol 读 base 和 head 的整个程序、给确定性答案、每条结论带调用链、不确定就说 `unknown`。「the agent reviews the lines first; then farol tells the person who approves how much attention the merge needs」——顺序是明确规定的：先 AI 评审，后风险聚焦。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**

- 信息：`farol.config.json`（路由表文件 / adapter / surface / language / `python.roots` / `routes.extraFiles` / `roles.global` / `backend.context.loaders`）；已存在的 coverage、lint、audit 报告的路径与格式（Istanbul `coverage-final.json`、`go test -coverprofile`、coverage.py JSON；eslint/golangci-lint/ruff JSON；npm audit/govulncheck/pip-audit）。
- 工具与权限：Node 22+、git；Go 需 `go mod download`；GitHub 上评论需要写权限 token，而跑 PR 代码的 job 必须无 secret + 只读 token。Datadog 需要 `DD_API_KEY`/`DD_APP_KEY`。
- 反馈回路：报告里勾 Mark as reviewed、Behind a feature flag、checked findings、checked with clients，最后 Copy as Markdown 贴回 PR——这是把「看过什么」变成可追溯记录的显式设计。
- 路径规则：给 `analyze` 的路径相对当前目录，`farol.config.json` 里的路径相对项目根。

**4. 主动推进（时间/事件/状态触发）**

事件触发很明确：每次 push 自动跑，产出两份报告（全量 PR + 自上次 push 起的提交），草稿 PR 跳过、fork PR 不发评论。时间触发也有一个：`farol-usage` job 每天读一次 Datadog。状态上它刻意**不**主动推进决策——shadow mode 从不 approve / request changes / fail check，把最后一步留给人。

**5. 效果验证**

工具内部就带验证机制：分数随标记 reviewed 而下降（随时知道还剩多少风险）、Result 页记录初始 verdict/分数与当前分数、`farol calibrate` 在自身历史上校准分数。判断「有没有改善」的指标原文给了两个：fast track 的误判率和分数的 AUC（见下节）。

## 与已有做法的关系

清单中有 **Claude Code**（tool，status: adopt）。原文对它的定位不是替代而是补位，并且直接引用了 Claude Code 团队的文章《How the Claude Code team does code review》中的观点：评审投入应跟随变更的风险，「The change sets the tier, not the author」。

落地时的关系是串联而非二选一：AI 评审 agent 逐行评论 diff → farol 在同一 PR 上再发一条评论，告诉审批者这次合并的风险和先读哪几个文件 → 人按 Test plan 手工验证 → 把 Result 贴回 PR 存档。原文在 FAQ 里把这点说得很直白：两者回答的是不同问题，agent 说「这些行可能哪里错了」，farol 说「这些行触达了什么、这次合并多危险、先看哪儿」，两个都跑，且都不阻塞合并。

清单中没有其他相关条目。

## 证据与局限

**原文给出的数据**：

- 在四个仓库的 662 个历史提交上，标为 `fast track` 的 56 个提交里**0 个出问题**；分数的 AUC 为 **0.72–0.83**。
- 性能：300 文件的 Python 服务约 3 秒，大型 TypeScript monorepo 或冷缓存的 Go 服务 8–10 秒，base 有缓存时不到 1 秒。
- 案例：live demo 是 FastAPI full-stack template 上一个真实 PR（后端加状态字段 + 前端加 Insights 页），报告给出 74/100 的 careful review、一处破坏性契约变更（`GET /brands` 不再返回 `response[].name`）、一处用 f-string 拼 SQL 的高危安全问题、一个没有测试的共享组件；前端报告则列出了共享组件触达的既有页面。这份报告与其 PR 评论指向的是同一批文件。

**只是作者主张、未见外部验证的部分**：40 文件的 PR 通常只有两三个文件真能造成伤害；「agent 不确定时会自信地说、farol 会说 unknown」；确定性带来更好的评审体验。这些听起来合理，但没有对照实验数据。

**明确的适用条件与局限**（原文自陈，必须写进手册的注意事项）：

- 纯静态：运行时构造的值看不见——动态拼的路由路径、`getattr`、`importlib`、DI 容器、循环里注册的 registry。入口读不出来时整个 PR 标 `unknown`；调用解析不出来时**假设触达更多而非更少**。
- TypeScript 前端只支持 React Router、Next.js、TanStack Router（基于文件的路由）：不支持代码式 TanStack 路由树、Remix/React Router 的文件约定、Vue、Svelte。JS 文件、重命名文件、TS 后端退化为模块级触达。
- Go：非 chi/gin/echo group 的中间件栈前缀不生效，自己包一层 router 的项目类型（原文举例 Gitea 的 `web.Router`）读不了。Python：Django REST Framework 的 routers 读不了。
- **分数和 verdict 阈值是启发式，只在少数仓库上查过**——这是最该警惕的一条，直接决定了本条目只能是 try 而不是 adopt。

## 怎么试、怎么验证

**最小试用（半天，不碰 CI）**：

1. 挑一个你熟悉、近期有中等规模 PR 的仓库，写最小 `farol.config.json`，跑 `npx @winninjs/farol routes`，确认入口点识别正确（识别错就先解决配置，别往下走）。
2. 挑 3–5 个**已经合并过、你事后知道结果**的 PR（包含至少一个后来出过事的），对每个跑 `analyze --base ... --head ...` + `html`。
3. 先自己凭经验给每个 PR 写一个「该多仔细看 / 重点看哪个文件」，再打开 farol 报告对比，看 verdict 是否同档、风险最高的文件是不是同一个。
4. 再挑一个真实的在审 PR 当「影子模式」用一遍：照着 Start here 读、跑 Test plan、把 Result 贴回 PR，看是否真的省了时间或抓到了原本会漏的东西。
5. 通过后再抄 `examples/workflow.yml` 接 CI，第一周保持全部 `continue-on-error`、不阻塞合并。

**判断有没有改善的指标**：

- **一致性**：你的人工风险判断与 verdict 的一致率；高风险文件是否落在 Start here 的前几名（漏报比误报更致命，重点看 `fast track` 里有没有你认为该仔细看的）。
- **校准**：在自身历史上跑 `farol calibrate`，看 AUC 是否落在原文报告的 0.72–0.83 附近；明显偏低说明你的技术栈没被很好地支持，应停在 study。
- **过程指标**：评审一个 PR 的耗时；每轮评审中「被标 reviewed 的文件数 / 变更文件数」；第二轮用 `--since` 后回看全量报告的比例。
- **结果指标**：合入后回滚/热修的比例，按 verdict 分桶统计（对照原文 fast track 56 个提交 0 问题的基线）。
- **可用性**：`routes` 与诊断里识别失败的入口点数量——这是所有指标的上限，识别率低则其余数字都不可信。
