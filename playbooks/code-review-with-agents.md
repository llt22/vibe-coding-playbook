# 让 PR 评审先看到改动的架构图：把 diff 变成可讨论的图再进评审

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：代码改动进入评审时，评审者只能从 diff 一行行猜系统怎么变；这篇手册给出把改动画成架构/数据流图并贴进 PR 的具体路线，以及判断它是否真的省事的试点方法。
> 先试这一步：选一个非关键仓库和一批中等规模 PR，先用 GitHub App（在仓库装 https://github.com/apps/coldtea-pr-lens 后开 PR）或本地 CLI（`npx @coldtea/pr-lens-cli analyze --base origin/main` 再 `render`）把改动画出来再评审，同时记录命名修正条数和评审中的理解性问题数量。
> 最近修订：2026-10-02

## 解决什么问题

评审代码改动时，评审者通常只拿到 diff：系统结构怎么变、数据怎么流，要靠脑补。PR Lens 把一次改动（PR 或本地未提交 diff）自动画成动画架构图和数据流图，以评论形式贴进 PR，或先在终端看。手册给出从最省事到自托管的几条路线，以及用小范围试点判断它是否真的让评审变轻松的方法。

## 适用与不适用

适用：

- 想让评审者在读 diff 前先看到系统结构和数据流变化。
- 有 GitHub / GitLab / Bitbucket 之一，或愿意在本地终端先看图。
- 愿意用小范围试点验证收益，而不是直接全仓库推开。

不适用或要谨慎：

- 关键仓库、合规要求高的仓库：调研只建议先在非关键仓库试点。
- 需要“评论随 push 更新”和“复选框切换视图”：只有 GitHub App 版本支持，Action、GitLab、Bitbucket 做不到或受限。
- Bitbucket 上 fork 来的 PR：pipeline 不会触发，pipe 永远画不了这类 PR。
- 不想把 diff 发给模型 provider：CLI 只把 diff 发给所选的 provider，但仍然是外发。

## 前置条件

- 目标平台有安装权限或 CI 配置权限。
- 路线 A（GitHub App）：能在目标仓库安装 GitHub App。
- 路线 B/C（编码代理）：本机有可用的编码代理（README 图示支持 Claude Code、Codex、Gemini CLI、Cursor、OpenCode、Copilot），以及 `gh` CLI。
- 自托管 CI 路线（D/E/F）：准备模型 key；示例默认 provider 是 Gemini，所以示例用 `GEMINI_API_KEY`。
- 本地 CLI 路线（G/H）：Node 20.11+；key 从环境变量读，不走命令行参数。

## 操作步骤

先选路线：

- 只想最省事、不需要自己的模型 key：做法 A。
- 想让编码 agent 画图并挂到 PR：做法 B；想连整套安装也让 agent 做：做法 C。
- 要用自己的 CI 和 key：做法 D（GitHub Action）、做法 E（GitLab CI/CD 组件）、做法 F（Bitbucket pipe）。
- 想在 PR 之前先在终端看图：做法 H，配合做法 G 的 CLI。
- 图里名字错了要持续修正：做法 I。

### 做法 A：装 GitHub App（最省事，不需要自己的模型 key）

前提：你有权限在目标仓库安装 GitHub App。

原文描述的三步：在任意仓库安装 App → 开一个 pull request → 图出现，并在每次 push 时更新同一条评论。安装地址 `https://github.com/apps/coldtea-pr-lens`。原文称对开源免费。只有 App 版本支持评论里的复选框（切换视图），因为 App 记得住状态。

预期结果：PR 上出现一条评论，包含动画架构/数据流图；每次 push 更新同一条评论。

### 做法 B：让编码代理画图并挂到 PR 上

前提：本机有可用的编码代理，以及 `gh` CLI。

```bash
npx skills add coldteadotai/pr-lens
```

然后对代理说（原文提示词）：

```text
Diagram the change you just made with PR Lens and attach it to the pull request.
```

代理会读 diff、写图文件，反复跑下面这条直到全部检查通过，再用 `gh pr create --attach` 把图附加到 PR 描述里：

```bash
npx @coldtea/pr-lens-cli validate
```

关键约定：图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`；skill 本身也是这么教代理的。

预期结果：代理把图文件写入 `.pr-lens/`（CLI 默认产物目录），`validate` 无报错，图被附加到 PR。

### 做法 C：想让代理把整套装好

前提：同做法 B。原文给出的整段提示词：

```text
Set up PR Lens for me. It draws code changes as moving diagrams of the system and how data flows through it.

1. Install the agent skill: `npx skills add coldteadotai/pr-lens`.

2. Help me install the GitHub App at https://github.com/apps/coldtea-pr-lens on every repository where I review pull requests. It posts one comment per pull request and updates that comment on every push. It does not need a model key from me.

3. If I'd rather run it from CI with my own model key, offer the Action instead: `.github/workflows/pr-lens.yml` using `coldteadotai/pr-lens/packages/action@v0`, with the key saved as a repository secret. It works with any service that speaks `/chat/completions`, such as OpenAI or Gemini.

4. Then test it: diagram the latest change in this repository and show me the SVGs or the canvas.
```

预期结果：代理按你选的路线装好 skill，并给出 App 或 Action 的选择；最后用当前仓库最近一次改动做演示。

### 做法 D：GitHub Action（跑在自己的 CI，用自己的 key）

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

预期结果：每个 PR 触发一次 Action，评论里贴出图；但同一 PR 后续 push 不会更新那条评论。

### 做法 E：GitLab CI/CD 组件

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

预期结果：merge request 上出现评论和图；若媒体文件要求认证，评论里的图可能不显示，但画布链接可用。

### 做法 F：Bitbucket pipe

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

已知限制：Bitbucket 评论是纯 Markdown，没有折叠段、没有明暗成对图；fork 来的 PR 不会触发 pipeline，pipe 永远画不了这类 PR。

预期结果：同仓库 PR 出现评论和图；fork PR 无输出。

### 做法 G：本地 CLI 一步步来（只有 `analyze` 会调模型）

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

预期结果：`.pr-lens/` 下有 graph.json、明暗两张 SVG、manifest；`validate` 报告所有契约问题而不是只报第一个；合并后可把 map 文件提交进仓库。

### 做法 H：PR 之前先在终端看图

```bash
npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
open .pr-lens/*-dark-*.svg    # macOS; the SVGs are self-contained, any browser reads them
```

这条用来审 agent 刚写的代码：让写代码的 agent 把改动画出来，自己对着 diff 看图，比 PR 上出现同一张图早几分钟。

预期结果：在本地浏览器打开自包含 SVG，不用等 PR 评论。

### 做法 I：用配置文件做持续修正（对所有路线都成立）

路径：GitHub 用 `.github/pr-lens.yml`；GitLab/Bitbucket 用 `.gitlab/pr-lens.yml`（调研原文在此处截断，具体键名以官方为准）。图里名字错了不要改生成的 SVG，改这个配置文件。

预期结果：下一次生成图时命名按配置文件修正，而不是每次手工改 SVG。

## 怎么判断变好了

调研结论只建议“选一个非关键仓库和一批中等规模 PR 做小范围试点”，没有给出建议时长，也没有任何对比或量化效果数据。可以按下面方式自己量：

- 最小试用方式：选一个非关键仓库，挑一批中等规模 PR，用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审。
- 可观察指标（来自调研结论）：
  - 命名修正条数：图里名字错了需要改配置文件多少次。如果一直很高，说明图对命名的自动理解不够好，或配置文件没设对。
  - `validate` 通过率：用 `npx @coldtea/pr-lens-cli validate ...` 检查文档，一次通过的比例。反复不通过说明代理或配置有问题。
  - 评审中的理解性问题数量：评审者问“这个改动到底改了哪块、数据怎么流”这类问题的次数。如果图真的有用，这类问题应减少。
- 试多久：调研没给时长；建议至少覆盖一批中等规模 PR 的完整评审周期后再判断，不要只看一个 PR。

## 常见坑

- 收益主张没有量化数据：README 给出的安装、CI 配置、CLI 命令和修正文件格式可照做，但所有“省事”“更好理解”的收益都只是作者自述，没有对比或量化效果数据。不要当成已证明的结论。
- 评论不更新：GitHub Action 在两次运行之间不保留状态，评论发出后不会更新；需要随 push 更新的评论和复选框，只有 GitHub App 版本支持。
- 改错地方：图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`（GitLab/Bitbucket 路径见做法 I）。
- GitLab 权限：`CI_JOB_TOKEN` 不能发评论，要带 `api` scope 的 token；GitLab.com 上 project access token 需要 Premium 或 Ultimate；Free 档用 personal access token 会让评论显示你的名字。
- GitLab 媒体文件：私有项目里任何拿到附件链接的人都能看到图；项目开启 **Require authentication to view media files** 后评论里的图不会加载。
- Bitbucket fork PR：fork 来的 PR 不会触发 pipeline，pipe 永远画不了这类 PR。
- 提交错产物：`.pr-lens/` 是临时目录，CLI 首次写入会自动加进 `.gitignore`；唯一值得提交的是 `export` 写出的 map 文件。
- key 外发：key 只通过环境变量传给 CLI，不上命令行；diff 只发给所选的 provider。用自托管 provider 时仍要确认 diff 是否允许外发。
- 默认 provider：示例默认 Gemini，所以示例 secret 名是 `GEMINI_API_KEY`；换 OpenAI 或 `openai-compatible` 时按文档改 `provider`、`base-url`、`model`。

## 证据与来源

- 调研报告：`coldteadotai/pr-lens`。
- 报告给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式：GitHub App 安装地址、`npx skills add coldteadotai/pr-lens`、`.github/workflows/pr-lens.yml` 的 Action 配置、GitLab CI/CD 组件、Bitbucket pipe、CLI 的 `analyze` / `render` / `comment` / `validate` / `export` 命令、`.pr-lens/` 产物约定、`.github/pr-lens.yml` 改名修正。
- 报告也给出了限制：Action 不保留状态、GitLab token 与媒体文件限制、Bitbucket fork PR 不触发、`.pr-lens/` 是临时目录只提交 map。
- 哪些只是作者主张：README 中“对开源免费”“省事”“更好理解改动”等收益表述均为作者自述，报告没有给出对比或量化效果数据；抓取元数据显示仓库 1821 stars（来自抓取 metrics，非原文内容），只能说明关注度，不能证明省事。
- 调研结论的建议：选一个非关键仓库和一批中等规模 PR 做小范围试点，用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。

## 依据的调研

- [coldteadotai/pr-lens](../research/radar/2026-10-02/601-coldteadotai-pr-lens.md)：值得一试，建议选一个非关键仓库和一批中等规模 PR 做小范围试点：用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审，并用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。理由是该 README 给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式，但全部收益主张都只是作者自述，没有任何对比或量化效果数据。
