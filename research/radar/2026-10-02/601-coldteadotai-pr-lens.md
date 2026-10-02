# coldteadotai/pr-lens

- 结论：**值得一试**。建议选一个非关键仓库和一批中等规模 PR 做小范围试点：用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审，并用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。理由是该 README 给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式，但全部收益主张都只是作者自述，没有任何对比或量化效果数据。
- 原文：https://github.com/coldteadotai/pr-lens
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T09:27:28.499Z

## 是什么

PR Lens 是 Coldtea 开发的工具（MIT 许可），把一次代码改动（PR 或本地未提交的 diff）自动画成动画架构图和数据流图，以评论形式直接贴在 pull request 里；同一张图还能打开成可缩放、可切换明暗主题的交互画布，并支持本地编码代理连上画布边看边问。README 列出六种运行方式：GitHub App、GitHub Action、GitLab CI/CD 组件、Bitbucket pipe、CLI、编码代理 skill。抓取元数据显示仓库 1821 stars（来自抓取 metrics，非原文内容）。

## 具体做法

以下路线按投入从低到高排列，前提逐条写明。

**1. 路线 A：装 GitHub App（最省事，不需要自己的模型 key）**
前提：你有权限在目标仓库安装 GitHub App。
原文描述的三步：在任意仓库安装 App → 开一个 pull request → 图出现，并在每次 push 时更新同一条评论。安装地址 `https://github.com/apps/coldtea-pr-lens`。原文称对开源免费。只有 App 版本支持评论里的复选框（切换视图），因为 App 记得住状态。

**2. 路线 B：让编码代理画图并挂到 PR 上**
前提：本机有可用的编码代理（README 图示支持 Claude Code、Codex、Gemini CLI、Cursor、OpenCode、Copilot），以及 `gh` CLI。

```bash
npx skills add coldteadotai/pr-lens
```

然后对代理说（原文给的提示词原样照抄）：

```text
Diagram the change you just made with PR Lens and attach it to the pull request.
```

代理会读 diff、写图文件，反复跑下面这条直到全部检查通过，再用 `gh pr create --attach` 把图附加到 PR 描述里：

```bash
npx @coldtea/pr-lens-cli validate
```

关键约定：**图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`**，skill 本身也是这么教代理的。

**3. 路线 C：想让代理把整套装好，粘这段**
前提：同上。原文给出的整段提示词：

```text
Set up PR Lens for me. It draws code changes as moving diagrams of the system and how data flows through it.

1. Install the agent skill: `npx skills add coldteadotai/pr-lens`.

2. Help me install the GitHub App at https://github.com/apps/coldtea-pr-lens on every repository where I review pull requests. It posts one comment per pull request and updates that comment on every push. It does not need a model key from me.

3. If I'd rather run it from CI with my own model key, offer the Action instead: `.github/workflows/pr-lens.yml` using `coldteadotai/pr-lens/packages/action@v0`, with the key saved as a repository secret. It works with any service that speaks `/chat/completions`, such as OpenAI or Gemini.

4. Then test it: diagram the latest change in this repository and show me the SVGs or the canvas.
```

**4. 路线 D：GitHub Action（跑在自己的 CI，用自己的 key）**
前提：把模型 key 存成仓库 secret（示例用 `GEMINI_API_KEY`，因为默认 provider 是 Gemini）。提交下面这个文件为 `.github/workflows/pr-lens.yml`：

```yaml
name: PR Lens

on:
  pull_request:

permissions:
  contents: write # to publish the rendered SVGs
  pull-requests: write # to post the comment

concurrency: # one run per pull request; a push supersedes the last
  group: pr-lens-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  lens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # the diff is between two commits, so both must be here
      - uses: coldteadotai/pr-lens/packages/action@v0
        with:
          api-key: ${{ secrets.GEMINI_API_KEY }}
```

`provider` 可选 `gemini`（默认）、`openai`，或 `openai-compatible` 配 `base-url` 和 `model`（因此可接 OpenRouter、DeepSeek、自建服务）。原文强调 key 只通过环境变量传给 CLI，不上命令行；diff 只发给所选的 provider。已知限制：Action 在两次运行之间不保留状态，所以评论发出后不会更新，复选框只在 App 里可用。

**5. 路线 E：GitLab CI/CD 组件**
前提：添加两个 masked 变量——模型 key，以及一个带 `api` scope 的 project access token（`CI_JOB_TOKEN` 不能发评论）。另外 `workflow: rules` 必须写在**你自己的** `.gitlab-ci.yml` 里，组件内的 rules 不算数。

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

include:
  - component: gitlab.com/coldteadotai/pr-lens/pr-lens@0.1.0
```

注意：GitLab.com 上 project access token 需要 Premium 或 Ultimate；Free 档可用带 `api` scope 的 personal access token，但评论会显示你的名字而不是机器人。SVG 以附件形式上传到项目：私有项目里任何拿到附件链接的人都能看到图；若项目开启 **Require authentication to view media files**，图不会加载（读者仍可从评论里的画布链接打开）。

**6. 路线 F：Bitbucket pipe**
前提：两个 secured 变量——模型 key，以及带 `pullrequest:write` 和 `repository:write` scope 的仓库访问 token（后者用于把图存进 Downloads；全 workspace 的 token 需 Premium）。

```yaml
clone:
  depth: full # the diff needs history back to the merge base

pipelines:
  pull-requests:
    "**":
      - step:
          name: PR Lens
          script:
            - pipe: docker://ghcr.io/coldteadotai/pr-lens-pipe:0.1.0
              variables:
                GEMINI_API_KEY: $GEMINI_API_KEY
                PR_LENS_TOKEN: $PR_LENS_TOKEN
```

已知限制：Bitbucket 评论是纯 Markdown，没有折叠段、没有明暗成对图；**fork 来的 PR 不会触发 pipeline，pipe 永远画不了这类 PR**。

**7. 路线 G：本地 CLI 一步步来（只有 `analyze` 会调模型）**
前提：Node 20.11+；key 从环境变量读，不走命令行参数。

```bash
export GEMINI_API_KEY=…    # the default provider; OPENAI_API_KEY with --provider openai

# Diff in, graph document out — measured against the merge base, not the branch tip.
npx @coldtea/pr-lens-cli analyze --base origin/main

# The document as light and dark SVGs, plus the manifest a comment is built from.
# Each drawing lands in its own directory under .pr-lens/, named after its title.
npx @coldtea/pr-lens-cli render .pr-lens/graph.json

# The pull request comment as markdown, on stdout. Posting is your business.
npx @coldtea/pr-lens-cli comment --graph .pr-lens/<drawing>/drawn.graph.json --manifest .pr-lens/<drawing>/manifest.json \
  --asset-base-url https://raw.githubusercontent.com/owner/repo/pr-lens/42

# Any PR Lens document, checked against the contract — every problem, not just the first.
npx @coldtea/pr-lens-cli validate .pr-lens/graph.json .github/pr-lens.yml

# After the merge: the pull-request document as a stored map of the system, worth committing.
npx @coldtea/pr-lens-cli export .pr-lens/graph.json -o .github/pr-lens.map.json
```

要点：产物都落在 `.pr-lens/`，CLI 首次写入会自动把它加进 `.gitignore`，视为随时可按 diff 重建的临时目录；**唯一值得提交的是 `export` 写出的 map 文件**。`--out` 可改输出位置；`comment --target gitlab` 或 `--target bitbucket` 可产出对应平台能显示的评论；`analyze` 会从 git remote 自动判断平台。接 Ollama、DeepSeek、OpenRouter 等任何说 `/chat/completions` 的服务用 `--provider openai-compatible --base-url <url>`。

**8. 路线 H：PR 之前先在终端看图**

```bash
npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
open .pr-lens/*-dark-*.svg    # macOS; the SVGs are self-contained, any browser reads them
```

这条用来审 agent 刚写的代码：让写代码的 agent 把改动画出来，自己对着 diff 看图，比 PR 上出现同一张图早几分钟。

**9. 通用：用配置文件做持续修正（对所有路线都成立）**
路径按平台：GitHub 用 `.github/pr-lens.yml`，GitLab/Bitbucket 用 `.gitlab/pr-lens.yml` 或仓库根目录的 `pr-lens.yml`。完整字段见 `packages/schema` 的 configuration reference。

```yaml
schemaVersion: 0.1.0
map:
  rename:
    - match: services/legacy-mailer.ts
      to: Postmark sender
  exclude:
    - "**/*.test.ts"
```

原文说明：这些修正叠在模型产出的结果之上，跨多次运行持续生效，即使模型每次命名不同也不受影响；可以重命名、排除文件、把卡片钉到某条泳道、把东西分组。

## 对应的研究问题

**1. 能力发现**
- 把“读懂一次改动/一个陌生代码库”本身作为可交付物交给模型，产出不是文本而是结构图，可以在读代码之前先看。
- 图里按颜色区分新增（绿）、修改（琥珀）、删除（红），并标出改动波及的系统范围（“architecture blast radius”）。
- 数据流按步播放，点任意箭头能看到该箭头承载的请求/响应载荷，新增字段绿、删除字段红。
- 给编码代理装 skill 后，代理可以在 PR 存在之前画自己的改动、自查；也可以连上画布做后续提问、放大某部分、框选几张卡再提问。

**2. 任务匹配**
- 适合：跨模块/跨服务的大改动、陌生代码库、需要先建立系统心智模型再读 diff 的场景（原文 Hall of Fame 的样例规模从 6 文件到 100 文件、最多 +8,076 行）。
- 模型侧：默认 Gemini；可换 openai；可换任何兼容 `/chat/completions` 的服务（OpenRouter、DeepSeek、自建、Ollama）。
- 协作方式按“评论要不要更新”选：App 有状态、每次 push 更新同一条评论、支持复选框；Action / GitLab 组件 / Bitbucket pipe 跑在自己的 CI、无状态。GitHub Action 明确说明“评论发出后不变，因为 Action 记不住两次运行之间的东西”。
- Bitbucket 用户若仓库大量收 fork PR，原文建议改用托管 App。

**3. 条件供给**
- 权限：GitHub Action 需要 `contents: write`（发布 SVG）和 `pull-requests: write`（发评论）；GitLab 需要带 `api` scope 的 token；Bitbucket 需要带 `pullrequest:write` 和 `repository:write` 的 token。
- 密钥：模型 key 存成仓库 secret / masked 变量；原文强调 key 只经环境变量传递，不出现在命令行。
- 历史：diff 是“两个 commit 之间”算的，所以 `fetch-depth: 0`、Bitbucket 的 `clone: depth: full` 是必需条件。
- 反馈层：`.github/pr-lens.yml` 就是“人给模型的持续修正”，配合 `validate` 作为代理的自检回路。
- 原文明确说 GitLab 的 `workflow: rules` 必须写在调用方自己的文件里——这是容易踩的配置前提。

**4. 主动推进**
- 触发源是 pull_request 事件（GitHub/GitLab/Bitbucket 皆是），不需要人手动发起。
- `concurrency` 组 `pr-lens-${{ github.event.pull_request.number }}` 配 `cancel-in-progress: true`：同一 PR 只保留一次运行，新 push 取代上一次。
- App 模式会在每次 push 自动更新同一条评论。
- 本地/终端模式可在 PR 尚未存在时主动跑，属于“状态触发”而非事件触发。

**5. 效果验证**
- 原文没有给出任何量化效果数据，也没有对照实验。
- 原文唯一接近“验证”的机制是工程性的：`validate` 会把文档对着 contract 全量校验（一次列出所有问题，不只报第一个）；`packages/cli` 提供“脚本可检出的 error codes”。
- 剩下的验证要自己设计（见末节）。

## 与已有做法的关系

清单条目：Claude Code（adopt）、Cursor（watch）、DeepSeek（try）、OpenCode（watch）、skills.sh（try）。

- **skills.sh（try）**：PR Lens 的代理侧能力就是通过 skill 分发的，安装命令是 `npx skills add coldteadotai/pr-lens`；这是清单里 skills.sh 这条“skill 分发机制”的一个具体可用样本。
- **Claude Code（adopt）/ Cursor / OpenCode（watch）**：README 的代理支持图里明确列出 Claude Code、Codex、Gemini CLI、Cursor、OpenCode、Copilot；也就是说这三条已有条目都可以直接作为 PR Lens 的调用入口，装完 skill 后让代理画图并 `gh pr create --attach`。
- **DeepSeek（try）**：可作为 `--provider openai-compatible --base-url <url>` 的后端，用于 CLI 或 Action，替代默认的 Gemini。
- 其余清单内容没有直接对应关系；清单中没有与“把 PR 画成图”这一具体做法重复的条目。

## 证据与局限

**原文给出的具体信息**
- Hall of Fame 的 10 个真实历史 PR 及其规模：react/react#13968（36 文件，+5,868/−130，5 泳道）、nodejs/node#41749（16 文件，+8,076/−3，5 泳道）、kubernetes/kubernetes#14175（8 文件，+766/−0，4 泳道）、vuejs/core#2532（11 文件，+1,081/−670）、rust-lang/rust#31954（26 文件）、tokio-rs/tokio#1657（100 文件，+7,408/−6,795）、neovim/neovim#11336（15 文件，+5,556/−1）、django/django#11209（38 文件）、webpack/webpack#10440（13 文件）、vllm-project/vllm#1348（6 文件，+764/−139）。这些都是**渲染能力的样例**，说明它能对真实大 PR 出图，不是“用了之后评审变快”的证据。
- 可验证的工程事实：CLI 命令、Action/GitLab/Bitbucket 配置片段、`validate` 的报错行为、`.pr-lens/` 自动进 `.gitignore`、`export` 产物建议提交。

**只是作者主张、没有支撑**
- “Not Mermaid, better”“减少认知负荷”“降低 overwhelm”等说法，均无对比数据或用户研究。
- “Free for open source”、各平台 token 档位要求属于产品/定价声明，可能随版本变化。
- 效果类判断（评审效率提升、理解更准确）在原文中完全缺失。

**适用条件与风险**
- 项目处于早期：配置示例写 `schemaVersion: 0.1.0`，GitHub Action 引用漂浮标签 `@v0`，GitLab 组件 `@0.1.0`，接口仍可能变。
- 数据外发：diff 会发给所选的模型 provider（原文只说“只发给你选的 provider”）。对代码敏感的团队需要自建 `openai-compatible` 端点或 Ollama。
- 权限面：App 需要装在仓库上；Action 需要 `contents: write` + `pull-requests: write`。
- 平台坑：GitLab 私有项目的附件链接一经获得即可查看（图本身是唯一保护）；开启媒体文件强制认证则图不显示；GitLab.com 的 project access token 需付费档；Bitbucket 的 fork PR 完全无法出图，且评论是纯 Markdown。
- 原文自己也在仓库贡献规则里提醒：多数工具默认给 commit 加 `Co-Authored-By` 或“Generated with”字样，需要显式关掉——说明作者对“代理产物需人工负责”这一点有明确立场。

## 怎么试、怎么验证

**最小试用（成本最低，先跑通链路）**
1. 选一个有代表性的中等规模 PR，本地执行路线 G/H 的三条命令（`analyze --base origin/main` → `render` → `open .pr-lens/*-dark-*.svg`），前提是设好 `GEMINI_API_KEY` 或换 `--provider openai-compatible` 指向自建端点。
2. 自己先看图再读 diff，记下“图里说对了什么 / 说错了什么”。
3. 如果第一步可用，再升级到路线 A（在一个非关键仓库装 App，开一个 PR 看评论），或用路线 D 在仓库里落一个 Action。

**验证指标（原文没给，需自己定义）**
- 命名准确率：同一仓库连续 5 个 PR，统计需要写进 `.github/pr-lens.yml` 的 rename 条数；条数下降说明图和你的系统术语在收敛。
- `validate` 首次通过率：代理一次就能写出合格图文件的比例（原文的 skill 流程就是反复跑到通过为止）。
- 评审行为是否改变：评审者是否在打开 diff 之前先看了图；评论里“这块是干什么的 / 为什么这么改”这类理解性问题的数量是否下降。
- 评审成本：同一批 PR 分成出图/不出图两组，比较从 PR 打开到首个实质评论的时长、评审轮次。
- 反向指标：图是否产生误导（把改动波及范围画小/画错），一旦出现，说明它还不能进关键路径。

**建议的决策门槛**
- 若 5 个 PR 内命名修正能收敛到个位数、且评审者反馈“先看图确实省时间”，可推到常规 PR 流程；
- 若主要问题都出在“模型理解错改动范围”，先停用，不要装到关键仓库；
- 若只是想让代理在写代码阶段自查，直接用路线 B + CLI，不必给仓库装 App，权限面最小。
