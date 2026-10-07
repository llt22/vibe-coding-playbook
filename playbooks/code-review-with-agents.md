# 在 push 和 PR 评审前，让 AI 先拿出可核对的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何用 AI 在 push 前先做一遍可核对的代码评审，并让 PR 评审者先看懂系统与数据流变化，而不是只靠 diff 脑补。
> 先试这一步：先在一个非关键仓库跑 `npx openqodex demo`，或装 GitHub App 看一条 PR 的架构/数据流图，选一个最小试点。
> 最近修订：2026-10-07

## 解决什么问题

代码评审有两个常见缺口：评审者通常只拿到 diff，系统结构怎么变、数据怎么流要靠脑补；push 前又缺少一遍可核对的自动评审，扫描告警是否落在改动行、每条告警是否被处理、每个改动行是否送到 reviewer 面前，容易漏。PR Lens 把一次改动自动画成动画架构图和数据流图，以评论形式贴进 PR，或先在终端看；OpenQodex 在 push 前跑确定性扫描器加独立 LLM reviewer，逐条核对扫描告警和改动行，并用完整性断言暴露漏审。手册给出从最省事到自托管的几条路线，以及用小范围试点判断它们是否真的让评审变轻松的方法。

## 适用与不适用

适用：

- 想让评审者在读 diff 前先看到系统结构和数据流变化。
- 有 GitHub / GitLab / Bitbucket 之一，或愿意在本地终端先看图。
- 想在 push 前先让 AI 做一遍评审，减少漏检、遗漏 suppression 注释和被改动的 scanner 配置。
- 有 macOS / Linux（Windows 用 WSL）、Node 22+、git，且已登录 Claude Code 或 Codex。
- 愿意用小范围试点验证收益，而不是直接全仓库推开或直接当默认门禁。

不适用或要谨慎：

- 关键仓库、合规要求高的仓库：两个调研都只建议先在非关键仓库试点。OpenQodex 仍用 Claude Code 或 Codex 作为 reviewer，数据边界要按你对这些 agent 的既有合规判断处理。
- 需要“PR 评论随 push 更新”和“复选框切换视图”：PR Lens 只有 GitHub App 版本支持，Action、GitLab、Bitbucket 做不到或受限。
- Bitbucket 上 fork 来的 PR：PR Lens pipeline 不会触发，pipe 永远画不了这类 PR。
- 不想把 diff 发给模型 provider：PR Lens CLI 只把 diff 发给所选的 provider，但仍然是外发。OpenQodex 除 Claude Code 或 Codex 外不需要别的 key、账号或服务器，但 reviewer 本身是这两个 agent。
- 没装 Claude Code 或 Codex：OpenQodex 只能跑 `openqodex scan`（只扫描）或 `review --agent`（让你所在的 agent 自己评审）。
- 想用 Cursor 或 Cline 当 OpenQodex reviewer：原文明确“No Cursor reviewer”，理由是 `cursor-agent` 无法把工具限制到只读、也无法跳过你的规则和设置；Cline 也没有被列为 reviewer。
- OpenQodex 项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。

## 前置条件

PR Lens 路线：

- 目标平台有安装权限或 CI 配置权限。
- 路线 A（GitHub App）：能在目标仓库安装 GitHub App。
- 路线 B/C（编码代理）：本机有可用的编码代理（README 图示支持 Claude Code、Codex、Gemini CLI、Cursor、OpenCode、Copilot），以及 `gh` CLI。
- 自托管 CI 路线（D/E/F）：准备模型 key；示例默认 provider 是 Gemini，所以示例用 `GEMINI_API_KEY`。
- 本地 CLI 路线（G/H）：Node 20.11+；key 从环境变量读，不走命令行参数。

OpenQodex 路线：

- Node 22 或更新 + git；macOS 或 Linux（Windows 用 WSL）。
- 装好并登录 Claude Code 或 Codex。reviewer 只能是这两个。
- 要跑 brakeman / rubocop 需要 Ruby 2.7 或更新，golangci-lint 需要 Go。OpenQodex 不替你装语言运行时，缺了会在报告里列为未安装并给出原因。
- 首次运行要下载扫描器；osv-scanner 需要能访问 osv.dev。semgrep 每次运行从 registry 拉规则包（`p/default`、`p/security-audit`、`p/secrets`）。
- 默认 `auto` 的 reviewer 挑选顺序是：你运行命令时所在的 agent → Claude Code → Codex。
- Claude Code（`claude -p`）隔离方式：只给 read / search / list 工具，在改动副本内运行，不带你的 settings、hooks、plugins、memory 或 instruction 文件；它的事件流记录每次读取，所以报告会列出它读过哪些文件。
- Codex（`codex exec`）隔离方式：在只读沙箱里启动，读权限限制在改动副本和系统目录，命令无网络，不带你的 config、plugins、hooks 或仓库的 instruction 文件；但它仍会加载全局 `~/.codex/AGENTS.md`，而且事件流不显示每条命令，报告会注明“读取未被记录”。
- 关掉 reviewer 的联网工具（Claude Code 的 WebSearch/WebFetch、Codex 的缓存 web 搜索）：在 `~/.openqodex/config.yaml` 里写 `reviewer_web: off`。
- 自定义扫描器必须经 `npx openqodex trust` 批准；改过配置就要重新批准。

## 操作步骤

先选路线：

- 只想最省事、不需要自己的模型 key，或想让 PR 评审者先看懂结构和数据流：走 PR Lens，做法 A-I。
- 想在 push 前先跑可核对的 AI 评审：走 OpenQodex，做法 J-Q。
- 两者可叠加：OpenQodex 在本地 push 前跑，PR Lens 在 PR 上贴图。它们不互相替代，冲突点是阶段不同：PR Lens 面向 PR 评审者，OpenQodex 面向 push 前自查。

### 路线一：让评审者看懂改动（PR Lens）

先选路线：

- 只想最省事、不需要自己的模型 key：做法 A。
- 想让编码 agent 画图并挂到 PR：做法 B；想连整套安装也让 agent 做：做法 C。
- 要用自己的 CI 和 key：做法 D（GitHub Action）、做法 E（GitLab CI/CD 组件）、做法 F（Bitbucket pipe）。
- 想在 PR 之前先在终端看图：做法 H，配合做法 G 的 CLI。
- 图里名字错了要持续修正：做法 I。

#### 做法 A：装 GitHub App（最省事，不需要自己的模型 key）

前提：你有权限在目标仓库安装 GitHub App。

原文描述的三步：在任意仓库安装 App → 开一个 pull request → 图出现，并在每次 push 时更新同一条评论。安装地址 `https://github.com/apps/coldtea-pr-lens`。原文称对开源免费。只有 App 版本支持评论里的复选框（切换视图），因为 App 记得住状态。

预期结果：PR 上出现一条评论，包含动画架构/数据流图；每次 push 更新同一条评论。

#### 做法 B：让编码代理画图并挂到 PR 上

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

#### 做法 C：想让代理把整套装好

前提：同做法 B。原文给出的整段提示词：

```text
Set up PR Lens for me. It draws code changes as moving diagrams of the system and how data flows through it.

1. Install the agent skill: `npx skills add coldteadotai/pr-lens`.

2. Help me install the GitHub App at https://github.com/apps/coldtea-pr-lens on every repository where I review pull requests. It posts one comment per pull request and updates that comment on every push. It does not need a model key from me.

3. If I'd rather run it from CI with my own model key, offer the Action instead: `.github/workflows/pr-lens.yml` using `coldteadotai/pr-lens/packages/action@v0`, with the key saved as a repository secret. It works with any service that speaks `/chat/completions`, such as OpenAI or Gemini.

4. Then test it: diagram the latest change in this repository and show me the SVGs or the canvas.
```

预期结果：代理按你选的路线装好 skill，并给出 App 或 Action 的选择；最后用当前仓库最近一次改动做演示。

#### 做法 D：GitHub Action（跑在自己的 CI，用自己的 key）

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

#### 做法 E：GitLab CI/CD 组件

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

#### 做法 F：Bitbucket pipe

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

#### 做法 G：本地 CLI 一步步来（只有 `analyze` 会调模型）

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

#### 做法 H：PR 之前先在终端看图

```bash
npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
open .pr-lens/*-dark-*.svg    # macOS; the SVGs are self-contained, any browser reads them
```

这条用来审 agent 刚写的代码：让写代码的 agent 把改动画出来，自己对着 diff 看图，比 PR 上出现同一张图早几分钟。

预期结果：在本地浏览器打开自包含 SVG，不用等 PR 评论。

#### 做法 I：用配置文件做持续修正（对所有路线都成立）

路径：GitHub 用 `.github/pr-lens.yml`；GitLab/Bitbucket 用 `.gitlab/pr-lens.yml`（调研原文在此处截断，具体键名以官方为准）。图里名字错了不要改生成的 SVG，改这个配置文件。

预期结果：下一次生成图时命名按配置文件修正，而不是每次手工改 SVG。

### 路线二：在 push 前做可核对的 AI 评审（OpenQodex）

#### 做法 J：先看 demo，再给当前机器安装

前提：Node 22+、git，macOS 或 Linux（Windows 用 WSL）。第一次建议先看 demo，它不碰你自己的代码。

```bash
npx openqodex demo
```

它会建一个小仓库、种入已知 bug 并扫描。然后安装：

```bash
npx openqodex init
```

它会找出机器上的 Claude Code、Cursor、Codex CLI 和 Cline，打印它将要写入的每个文件并只问一次。装完直接评审你当前的改动，或在没有改动时问你要评审什么。之后可以对 agent 说“review my change with openqodex”，或自己跑 `openqodex review`。

预期结果：demo 能跑通；`init` 只问一次并列出将写入的文件；装完可评审当前改动。

#### 做法 K：给 agent 装 OpenQodex skill

前提：你希望 agent 自己触发评审。

```bash
npx skills add openqodex/openqodex
```

或把这段提示词粘进 agent：

```text
Install the OpenQodex skill with `npx skills add openqodex/openqodex`.
Then review my current change with openqodex and tell me the verdict and the findings.
```

预期结果：agent 装上 skill，并对当前改动跑一次 OpenQodex，回报 verdict 和 findings。

#### 做法 L：日常评审与选择 reviewer

前提：在改动所在的仓库里跑。

```bash
openqodex review
openqodex review --all
openqodex review <branch>
openqodex review '#42'
```

`--all` 评审整个仓库；`<branch>` 和 `'#42'` 评审不是当前工作的分支或 PR——OpenQodex 会自己 fetch、checkout 到临时目录，只评审它离开 base 之后新增的内容。

选 reviewer：

```bash
openqodex review --reviewer codex
```

或在 `~/.openqodex/config.yaml` 里写 `reviewer:`。默认 `auto` 的挑选顺序是：你运行命令时所在的 agent → Claude Code → Codex。两个 reviewer 的隔离方式不同，选之前要知道：

- Claude Code（`claude -p`）：只给 read / search / list 工具，在改动副本内运行，不带你的 settings、hooks、plugins、memory 或 instruction 文件；它的事件流记录每次读取，所以报告会列出它读过哪些文件。
- Codex（`codex exec`）：在只读沙箱里启动，读权限限制在改动副本和系统目录，命令无网络，不带你的 config、plugins、hooks 或仓库的 instruction 文件；但它仍会加载全局 `~/.codex/AGENTS.md`，而且事件流不显示每条命令，报告会注明“读取未被记录”。

关掉 reviewer 的联网工具（Claude Code 的 WebSearch/WebFetch、Codex 的缓存 web 搜索）：在 `~/.openqodex/config.yaml` 里写 `reviewer_web: off`。

预期结果：终端打印评审报告，并按配置选择 Claude Code 或 Codex 作为独立 reviewer。

#### 做法 M：读报告，并检查完整性

报告打在终端，同时写 `report.md`、`report.json`、`report.sarif`。判定“评审完成”的条件是三条同时成立：每个阶段都跑了、每条扫描告警都被提升或带理由丢弃、每一行改动都送到了 reviewer 面前（在 brief 里、在 OpenQodex 后来的消息里，或对 Claude Code 而言在它读过的文件里）。任何一条不满足就打“Review incomplete”并列出缺什么，退出码为 2。注意：只删除代码的改动也可能带告警——删除处相邻的行算作改动行。

预期结果：你能同时拿到终端报告和三种文件报告；若三条完整性断言任一条不满足，报告会打“Review incomplete”并给退出码 2，可被 CI 当失败。

#### 做法 N：接门禁与 CI

前提：你想把 OpenQodex 放到 push 前或 PR 上。原文给出：

- push gate（Claude Code 和 Codex 各一套）+ 可选的 git pre-push hook：两者都只去找“正好是这次要推送的内容”的评审，自己不做扫描也不做评审；默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block。
- GitHub Action：workflow 给了 Anthropic API key 时对 PR 跑完整评审，没给就只跑 `openqodex scan`。
- pre-commit hook：只跑扫描器，不是一次评审。

预期结果：默认只 warn；只有显式设置 `review.block_on_severity` 才会 block。GitHub Action 没给 Anthropic API key 时只扫描，不跑完整 LLM 评审。

#### 做法 O：加自定义扫描器

前提：你想让扫描器清单覆盖更多工具。在仓库的 `.openqodex/config.yaml` 里写：

```yaml
scanners:
  custom:
    - source: https://github.com/aquasecurity/trivy
      run: trivy config --format sarif --output {report} {target}
```

然后必须批准才会跑：

```bash
npx openqodex trust
```

`trust` 会挑出对应你机器的 release asset 并下载，显示版本、asset、它的 sha256 和 run 行，然后问 yes/no。改过这条配置就要重新批准。

预期结果：自定义扫描器在批准后才会运行；改配置会触发重新批准。

#### 做法 P：扫描器安装与管理

前提：首次使用会把扫描器下到 `~/.openqodex/tools/`，只下你这次改动需要的。单个安装超过 45 秒会转后台继续，报告里把它标为 installing，下次运行才加入。要一次装齐：

```bash
npx openqodex doctor --install
```

关掉 brakeman（它的 license 不是开源的）：`scanners.disable: [brakeman]`。

预期结果：首次只下载需要的扫描器；超 45 秒的安装转后台并在报告中标为 installing，下次运行加入；可一次性安装全部。

#### 做法 Q：离线与自动更新控制

前提：你需要在无网或受控更新环境下使用。`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支/PR 评审的 fetch 和 `gh` 调用。自动更新用 `openqodex update --off`、`~/.openqodex/config.yaml` 里的 `update: off` 或环境变量 `OPENQODEX_AUTO_UPDATE=0` 关闭（`--offline` 和设置了 `CI` 时也自动关）；`openqodex update --rollback` 回退。用 `npx openqodex guide <topic>` 可离线看文档页。

预期结果：离线时不跑 osv-scanner 和 semgrep，也不做下载、版本检查和分支/PR fetch；自动更新可按配置关闭或回退。

## 怎么判断变好了

两个调研都只建议小范围试点，没有给出统一的建议时长，也没有给出检出率、误报率、返工时间等量化效果数据。可以按下面方式自己量：

- 最小试用方式：PR Lens 选一个非关键仓库，挑一批中等规模 PR，用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审。OpenQodex 在一台 macOS/Linux 机器上先跑 `npx openqodex demo`，再在一个非关键仓库跑 `npx openqodex init`，按三点验收：报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前。

PR Lens 可观察指标（来自调研结论）：

- 命名修正条数：图里名字错了需要改配置文件多少次。如果一直很高，说明图对命名的自动理解不够好，或配置文件没设对。
- `validate` 通过率：用 `npx @coldtea/pr-lens-cli validate ...` 检查文档，一次通过的比例。反复不通过说明代理或配置有问题。
- 评审中的理解性问题数量：评审者问“这个改动到底改了哪块、数据怎么流”这类问题的次数。如果图真的有用，这类问题应减少。

OpenQodex 可观察指标（来自调研结论）：

- 报告是否退出码 2：三条完整性断言任一不满足就打“Review incomplete”并 exit 2。
- 每条扫描告警是否有理由：reviewer 被要求对每条告警给出“提升或带理由丢弃”。
- 每个改动行是否送到 reviewer 面前：在 brief 里、在 OpenQodex 后来的消息里，或对 Claude Code 而言在它读过的文件里。
- 报告是否同时输出终端和 `report.md`、`report.json`、`report.sarif`。

试多久：两个调研都没给建议时长；至少覆盖一批中等规模 PR 或改动的完整评审周期后再判断，不要只看一个 PR 或一次评审。

## 常见坑

- 收益主张没有量化数据：PR Lens README 给出的安装、CI 配置、CLI 命令和修正文件格式可照做，但所有“省事”“更好理解”的收益都只是作者自述，没有对比或量化效果数据。OpenQodex 也没有给出检出率、误报率、返工时间等效果数据。不要当成已证明的结论。
- OpenQodex 成熟度：项目自述仍在 1.0 之前，仓库仅 30 stars，单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度；还不够格直接当默认门禁。
- PR Lens 评论不更新：GitHub Action 在两次运行之间不保留状态，评论发出后不会更新；需要随 push 更新的评论和复选框，只有 GitHub App 版本支持。
- PR Lens 改错地方：图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`（GitLab/Bitbucket 路径见做法 I）。
- PR Lens GitLab 权限：`CI_JOB_TOKEN` 不能发评论，要带 `api` scope 的 token；GitLab.com 上 project access token 需要 Premium 或 Ultimate；Free 档用 personal access token 会让评论显示你的名字。
- PR Lens GitLab 媒体文件：私有项目里任何拿到附件链接的人都能看到图；项目开启 **Require authentication to view media files** 后评论里的图不会加载。
- PR Lens Bitbucket fork PR：fork 来的 PR 不会触发 pipeline，pipe 永远画不了这类 PR。
- PR Lens 提交错产物：`.pr-lens/` 是临时目录，CLI 首次写入会自动加进 `.gitignore`；唯一值得提交的是 `export` 写出的 map 文件。
- PR Lens key 外发：key 只通过环境变量传给 CLI，不上命令行；diff 只发给所选的 provider。用自托管 provider 时仍要确认 diff 是否允许外发。
- PR Lens 默认 provider：示例默认 Gemini，所以示例 secret 名是 `GEMINI_API_KEY`；换 OpenAI 或 `openai-compatible` 时按文档改 `provider`、`base-url`、`model`。
- OpenQodex 缺 reviewer：没装 Claude Code 或 Codex 时只能跑 `openqodex scan` 或 `review --agent`；Cursor 不能当 reviewer，Cline 也未列为 reviewer。
- OpenQodex 运行时和网络：OpenQodex 不替你装语言运行时；缺了会在报告里列为未安装并给出原因。首次下载扫描器需要网络；osv-scanner 需要访问 osv.dev；semgrep 每次运行从 registry 拉规则包。
- OpenQodex Codex 验证缺口：Codex 侧事件流不显示每条命令，报告会注明“读取未被记录”；它仍会加载全局 `~/.codex/AGENTS.md`。
- OpenQodex 自定义扫描器：必须经 `npx openqodex trust` 批准；`trust` 显示版本、asset、sha256 和 run 行后问 yes/no；改过配置就要重新批准。
- OpenQodex 删除改动：只删除代码的改动也可能带告警——删除处相邻的行算作改动行。
- OpenQodex 门禁默认：push gate 和 pre-push hook 默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block；pre-commit hook 只跑扫描器，不是一次评审；GitHub Action 没给 Anthropic API key 时只跑 `openqodex scan`。
- OpenQodex 离线：`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支/PR 评审的 fetch 和 `gh` 调用。
- OpenQodex 自动更新：默认可能每天最多一次后台找新版本并自动更新，且只在 release 至少 24 小时、其 npm provenance 显示由本仓库 release workflow 构建时才装；可用 `openqodex update --off`、`~/.openqodex/config.yaml` 的 `update: off` 或 `OPENQODEX_AUTO_UPDATE=0` 关闭，`openqodex update --rollback` 回退。
- 新旧做法关系：PR Lens 是 PR 阶段画图，OpenQodex 是 push 前评审；不互相替代，可叠加。PR Lens 的 GitHub App 不需要自己的模型 key；OpenQodex 用已有 Claude Code 或 Codex。

## 证据与来源

- 做法 A-I 依据调研报告 `coldteadotai/pr-lens`。报告给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式：GitHub App 安装地址、`npx skills add coldteadotai/pr-lens`、`.github/workflows/pr-lens.yml` 的 Action 配置、GitLab CI/CD 组件、Bitbucket pipe、CLI 的 `analyze` / `render` / `comment` / `validate` / `export` 命令、`.pr-lens/` 产物约定、`.github/pr-lens.yml` 改名修正。
- PR Lens 报告也给出了限制：Action 不保留状态、GitLab token 与媒体文件限制、Bitbucket fork PR 不触发、`.pr-lens/` 是临时目录只提交 map。
- PR Lens 哪些只是作者主张：README 中“对开源免费”“省事”“更好理解改动”等收益表述均为作者自述，报告没有给出对比或量化效果数据；抓取元数据显示仓库 1821 stars（来自抓取 metrics，非原文内容），只能说明关注度，不能证明省事。
- 做法 J-Q 依据调研报告 `openqodex/openqodex`。报告给出的可照做内容包括：`npx openqodex demo`、`npx openqodex init`、`npx skills add openqodex/openqodex`、`openqodex review` / `--all` / `<branch>` / `'#42'`、`openqodex review --reviewer codex`、`~/.openqodex/config.yaml` 的 `reviewer:` 与 `reviewer_web: off`、`report.md` / `report.json` / `report.sarif`、`.openqodex/config.yaml` 自定义扫描器、`npx openqodex trust`、`npx openqodex doctor --install`、`scanners.disable: [brakeman]`、`--offline`、`openqodex update --off` / `--rollback` / `OPENQODEX_AUTO_UPDATE=0`、`npx openqodex guide <topic>`。
- OpenQodex 报告给出的数据：13 个内置扫描器各自的版本、触发条件、下载体积（Apple Silicon / Linux x64 两列，例如 gitleaks 2.9 MB / 3.0 MB，osv-scanner 31.8 MB / 32.1 MB，hadolint 102.6 MB / 55.7 MB）。报告还提到首次运行实测条件是 Apple Silicon Mac、空工具目录、2 MB/s 带宽，但材料在此截断，未给出结果。
- OpenQodex 报告给出的限制：项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗自己的 Claude Code/Codex 额度；没有检出率、误报率、返工时间等效果数据；Codex 侧读取未被记录；Cursor 不能当 reviewer；Cline 也未列为 reviewer。
- OpenQodex 哪些只是作者主张：README 把它描述成“给 Claude Code 和 Codex 用的开源 AI 代码评审工具”，并给出“一条 `openqodex review` 会……”的流程说明；这些流程可照做，但收益没有量化对比。OpenQodex 的验收标准是流程完整性，不是检出率。
- 新旧做法差异：PR Lens 面向 PR 评审者，把 diff 画成架构/数据流图；OpenQodex 面向 push 前，跑扫描器加独立 LLM reviewer 并做完整性断言。两者阶段不同，可叠加；若只能选一个，先按你的主要缺口选：看不懂改动用 PR Lens，怕 push 前漏检用 OpenQodex。

## 依据的调研

- [coldteadotai/pr-lens](../research/radar/2026-10-02/601-coldteadotai-pr-lens.md)：值得一试，建议选一个非关键仓库和一批中等规模 PR 做小范围试点：用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审，并用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。理由是该 README 给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式，但全部收益主张都只是作者自述，没有任何对比或量化效果数据。
- [openqodex/openqodex](../research/radar/2026-10-07/1814-openqodex-openqodex.md)：值得一试，可以在一台 macOS/Linux 机器上用 `npx openqodex demo` 加一个非关键仓库的 `npx openqodex init` 做小范围试用，按“报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前”三点验收；理由是它把“确定性扫描器 + 独立 LLM 评审逐条核对 + 完整性断言”做成了一条命令的流程，可复制的命令和配置原文都给全了，但项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。
