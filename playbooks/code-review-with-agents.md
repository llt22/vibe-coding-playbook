# 让 AI 在宣布完成前拿出证据：用内置命令与四条路线审代码

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：代码评审缺少结构图、push 前可核对的自动评审和主动找漏洞，而且很多人不知道自己已有的 Claude Code 里就有 /code-review 可用。
> 先试这一步：如果你已经在用 Claude Code，下次审代码时先原样跑一次 `/code-review`（别名 `/review`），记录它报出的问题清单，再对照人工 review 标记真 bug 和误报。
> 最近修订：2026-10-11

## 解决什么问题

代码评审有四个常见缺口：评审者通常只拿到 diff，系统结构怎么变、数据怎么流要靠脑补；push 前又缺少一遍可核对的自动评审，扫描告警是否落在改动行、每条告警是否被处理、每个改动行是否送到 reviewer 面前，容易漏；常规评审是被动等告警，缺少主动的对抗性漏洞寻找；如果你已经在用 Claude Code，它其实内置了 `/code-review`（别名 `/review`）这类专门审代码的命令，可以按强度档位（low 到 max）跑，还能 `--fix` 直接修、`--comment` 发到 PR、`ultra` 走云端深度审查——但这条来源是个人推文且正文截断，参数拼接语法、权限和配置都需要先对照官方 Commands 文档确认。PR Lens 把一次改动自动画成动画架构图和数据流图，以评论形式贴进 PR，或先在终端看；OpenQodex 在 push 前跑确定性扫描器加独立 LLM reviewer，逐条核对扫描告警和改动行，并用完整性断言暴露漏审；还有一条可复制的提示词，让编码代理把整个项目当成对抗性审查对象，自主决定使用多少个子代理来并行找漏洞，对每个返回的问题再做一次核验，确认无误后才写入“已检查问题列表”。手册给出从最省事（Claude Code 内置命令）到 PR Lens、OpenQodex、再到子代理对抗审查的几条路线，以及用小范围试点判断它们是否真的让评审变轻松的方法。

## 适用与不适用

适用：

- 想让评审者在读 diff 前先看到系统结构和数据流变化。
- 有 GitHub / GitLab / Bitbucket 之一，或愿意在本地终端先看图。
- 想在 push 前先让 AI 做一遍评审，减少漏检、遗漏 suppression 注释和被改动的 scanner 配置。
- 有 macOS / Linux（Windows 用 WSL）、Node 22+、git，且已登录 Claude Code 或 Codex。
- 愿意用小范围试点验证收益，而不是直接全仓库推开或直接当默认门禁。
- 想让编码代理主动找漏洞，而不是只等扫描器出告警；所用工具支持子代理/子任务机制；愿意人工逐条复核代理核验过的问题列表。
- 已经在用 Claude Code，且有代码或 PR 需要审查：可以直接试内置的 `/code-review`（别名 `/review`），它专找正确性 bug，有强度档位（low 到 max），还能 `--fix` 直接修、`--comment` 发到 PR、`ultra` 走云端深度审查。
- 想先用最低成本试一条内置命令，不装新工具、不配 key（因为 `/code-review` 是 Claude Code 内置能力）。

不适用或要谨慎：

- 关键仓库、合规要求高的仓库：三个调研都只建议先在非关键仓库试点。OpenQodex 仍用 Claude Code 或 Codex 作为 reviewer，数据边界要按你对这些 agent 的既有合规判断处理；Claude Code 内置 `/code-review` 同样是在 Claude Code 里跑，代码内容会进入该会话的上下文。
- 需要“PR 评论随 push 更新”和“复选框切换视图”：PR Lens 只有 GitHub App 版本支持，Action、GitLab、Bitbucket 做不到或受限。
- Bitbucket 上 fork 来的 PR：PR Lens pipeline 不会触发，pipe 永远画不了这类 PR。
- 不想把 diff 发给模型 provider：PR Lens CLI 只把 diff 发给所选的 provider，但仍然是外发。OpenQodex 除 Claude Code 或 Codex 外不需要别的 key、账号或服务器，但 reviewer 本身是这两个 agent。Claude Code 内置 `/code-review` 也在 Claude Code 会话内处理代码，是否外发取决于你如何使用 Claude Code。
- 没装 Claude Code 或 Codex：OpenQodex 只能跑 `openqodex scan`（只扫描）或 `review --agent`（让你所在的 agent 自己评审）。不使用 Claude Code 的人也无法用 `/code-review` 这条路。
- 想用 Cursor 或 Cline 当 OpenQodex reviewer：原文明确“No Cursor reviewer”，理由是 `cursor-agent` 无法把工具限制到只读、也无法跳过你的规则和设置；Cline 也没有被列为 reviewer。
- OpenQodex 项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消费你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。
- Claude Code `/code-review` 的来源是个人推文（作者 @riba2534），不是 Anthropic 官方文档；互动数据为 likes 24、reposts 3、replies 2，属于小范围传播，不能作为功能有效性的证据。
- `/code-review` 正文在“审代码”这一段后就截断了，原文声称的“按场景完整清单”其余部分不可见；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本。实际使用前必须对照原文链接的 `Commands - Claude Code Docs` 页面确认。
- `/code-review` 的“专找正确性 bug”“走云端深度审查”是作者对行为的概括，未附任何案例、命中率或对比数据。
- 如果 `/code-review` 的误报率高到需要逐条反驳，或没有明显优于纯人工，就只保留在“知道有这条路”的层面，不写入手册主体。
- 原文提示词只有一个完整版本（编号 1），编号 2 在采集时已被截断；没有项目规模、语言、模型配置、子代理数量、运行耗时、成本等参数；没有输出样例、缺陷清单或结果数据。不要指望照抄就能复现“震惊”的效果。
- 对抗审查依赖所用编码代理支持子代理/子任务机制；不支持的话，这条提示词会退化成普通的“找漏洞”指令。
- “双重检查”由同一个模型完成，存在自我确认偏差的可能；报告原文未讨论这一点，人工抽检或全检是必要的。
- 原文没有说明“列表”的载体——文件、聊天回复还是内置任务列表；需要你自己指定输出位置。

## 前置条件

Claude Code 内置 `/code-review` 路线：

- 已在工作环境里装好并登录 Claude Code（项目清单显示 Claude Code 条目状态为 adopt，说明该工具本身已在采用范围内）。
- 有需要审查的代码或 PR。
- 原文未说明所需权限与配置。`--comment` 需要能把结果发到 PR，意味着要有对应 PR 的访问路径；`ultra` 走云端，意味着需要联网/云端算力。这两条是推断，原文没有明确说明，使用前请对照官方文档确认。
- 官方 `Commands - Claude Code Docs` 页面（原文给了链接卡片，但该页在材料中未被抓取到正文），用于确认合法档位、参数拼接语法、权限和适用版本。

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

对抗审查路线：

- 一个代码完整、能运行或至少能被代理读全的仓库。
- 一个支持“子代理/子任务”机制的编码代理工具（原文只提到在“Ultra”上运行“Astra 6”，未说明具体产品、版本或配置，需自行换成你手上的工具）。
- 确认上下文窗口足够装下项目的主要代码结构；原文没有给出仓库规模、语言、子代理数量等参数，这些需要你自己按项目大小调整。
- 代理需要读全项目的权限、允许自行派生多个子代理，以及一个可持久化的问题列表来承接核验通过的结果。

## 操作步骤

先选路线：

- 已经在用 Claude Code，想先试最省事的内置审查：走路线零，做法 S。
- 只想最省事、不需要自己的模型 key，或想让 PR 评审者先看懂结构和数据流：走 PR Lens，做法 A-I。
- 想在 push 前先跑可核对的 AI 评审：走 OpenQodex，做法 J-Q。
- 想让编码代理主动对抗性找漏洞、并先做二次核验：走对抗审查路线，做法 R。
- 四者可叠加，阶段不同：Claude Code 内置 `/code-review` 是代码审查命令，可在写码后、PR 前跑，也可用 `--comment` 发到 PR；PR Lens 在 PR 阶段画图，面向 PR 评审者；OpenQodex 在 push 前评审，面向自查漏检；对抗审查是让代理主动找漏洞，可与前几者再叠加。它们不互相替代。若只能选一个，先按你的主要缺口选：已经在用 Claude Code 且想快速跑一遍审查用 `/code-review`，看不懂改动用 PR Lens，怕 push 前漏检用 OpenQodex，想主动找漏洞用对抗审查。

### 路线零：用 Claude Code 内置的 `/code-review`（做法 S，最省事，如果已在用 Claude Code）

前提：已在工作环境里装好并登录 Claude Code；有需要审查的代码或 PR。原文未说明所需权限与配置；`--comment` 需要能把结果发到 PR，`ultra` 走云端，这两条是推断，使用前先查官方 `Commands - Claude Code Docs`。

1. 在需要审查的代码上打开 Claude Code 会话（原文未说明是在仓库目录，还是针对某个 PR）。
2. 输入审查命令：

```text
/code-review
```

原文标明它的定位是“专找正确性 bug”，别名是 `/review`，两者等价。
3. 选择审查强度：原文只给出区间“low 到 max”，未列出完整档位名称，也未给出传参写法。使用前先在官方 Commands 文档里确认合法档位与写法，不要照猜。
4. 想让 AI 直接改代码时加上 `--fix`（原文：“--fix 直接修”）。
5. 想让结果发布到 PR 时加上 `--comment`（原文：“--comment 发到 PR”）。
6. 需要更深的审查时用 `ultra`，原文说明它“走云端深度审查”（即由云端算力做更重的一轮）。原文未给 `ultra` 的调用写法，需查文档。
7. 其余内置命令与完整参数，去原文链接的 `Commands - Claude Code Docs` 页面查（该文档在材料中只有链接卡片，未抓取到正文）。

预期结果：按原文可确认的信息，Claude Code 会针对正确性 bug 给出审查结果；若加了 `--fix`，它会直接改；若加了 `--comment`，结果会发到 PR。但强度档位、`ultra` 写法、权限和配置因原文截断无法确认，必须对照官方文档后再正式使用。

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

### 路线三：让代理做对抗性漏洞审查（做法 R）

这条路线来自一条推文，原文只给出一条完整提示词，做法是让编码代理把整个项目当成对抗性审查对象，自行决定使用多少子代理并行找漏洞，对每个返回的问题二次核验后才写入列表。

#### 做法 R：原样粘贴提示词，让代理用子代理找漏洞并二次核验

前提：准备一个代码完整、能运行或至少能被代理读全的仓库；使用一个支持“子代理/子任务”机制的编码代理工具（原文只提到在“Ultra”上运行“Astra 6”，未说明具体产品、版本或配置，需自行换成你手上的工具）；确认该工具的子代理功能已打开；确认上下文窗口足够装下项目的主要代码结构。原文没有给出仓库规模、语言、子代理数量等参数，这些需要你自己按项目大小调整。

1. 在代理会话中**原样粘贴**下面这条提示词：

```text
彻底检查这个项目，寻找漏洞。将它视为对抗性审查，使用你想要的任意多子代理。当一个问题返回时，双重检查它是否正确，并将已检查的问题添加到列表中。
```

2. **允许代理自行决定子代理数量**。提示词里写的是“使用你想要的任意多子代理”，即把并行度交给模型判断，而不是人预先指定。若你的工具需要显式开启子代理功能，先确认该功能已打开。

3. **要求代理对每条问题做二次核验**：提示词中的“双重检查它是否正确”就是这个动作。如果工具支持把核验过程显式化，可以让代理对每条问题给出“为何判定为真”的说明，再决定是否入列。

4. **把通过核验的问题写入列表**（提示词中的“将已检查的问题添加到列表中”）。原文没有说明这个列表是什么载体——文件、聊天回复还是内置任务列表，需要你自己指定输出位置，例如让代理写入仓库根目录下的一个 Markdown 文件。

5. **人工复核列表并修复**。原文没有给出人工复核这一步，但既然“双重检查”由模型自己做，人工抽检是必要的。逐条判定每个入列问题是“真缺陷 / 误报 / 已知问题 / 风格偏好”，记录数量和时间。

6. 原文中编号 2 的提示词因截断无法还原，不要凭猜测补写。

预期结果：代理用若干子代理并行找漏洞，对返回的问题二次核验后，把通过核验的问题写入你指定的列表；你再逐条复核并修复。

## 怎么判断变好了

四个路线都只建议小范围试点，没有给出统一的建议时长，也没有给出检出率、误报率、返工时间等量化效果数据。可以按下面方式自己量：

Claude Code `/code-review` 最小试用方式（来自调研结论的试用建议）：

1. 选一个已完成、你本来就要人工 review 的真实 PR 或一次提交作为对照样本。
2. 先原样跑一次 `/code-review`（不带任何参数），记录它报出的问题清单。
3. 对照你自己的人工 review 结论，标记：真 bug、误报、漏掉但人工发现的 bug。
4. 再对同一处跑一次带 `--fix` 的版本，看它给出的修改是否可以直接采纳（先不提交，只做 diff 对比）。
5. 只有在上面两步结果可接受时，才试 `--comment` 发到 PR，观察同事对评论质量的反馈。
6. 强度档位和 `ultra` 的对比，建议在同一个 PR 上分别跑一次，比较命中数与耗时（原文未给档位写法，需先查文档）。

可观察指标（自设，原文未提供）：

- 真实 bug 命中数 / 总报出数（准确率），以及漏检的真实 bug 数。
- 审阅同一个 PR 的耗时，与纯人工 review 相比的变化。
- `--fix` 产出的修改中被你采纳的比例。
- 若用了 `--comment`：PR 上评论被回应、被采纳的比例。
- 若对比了强度档位：各档位的准确率与耗时/成本，用来决定默认档位。

若以上指标没有明显优于纯人工，或误报率高到需要逐条反驳，则本条只保留在“知道有这条路”的层面，不写入手册主体。

PR Lens 最小试用方式：选一个非关键仓库，挑一批中等规模 PR，用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审。

OpenQodex 最小试用方式：在一台 macOS/Linux 机器上先跑 `npx openqodex demo`，再在一个非关键仓库跑 `npx openqodex init`，按三点验收：报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前。

对抗审查最小试用方式：挑一个中等规模、你比较熟悉的代码仓库（这样你能判断报告里哪些是真问题），用支持子代理的编码代理原样粘贴那条提示词，让它把通过核验的问题写入一个指定文件；人工逐条判定每个入列问题是“真缺陷 / 误报 / 已知问题 / 风格偏好”，记录数量和时间。作为对照，用同一工具、同一条提示词但**不启用子代理**（或人工只做一遍常规审查）跑一次，比较结果。

PR Lens 可观察指标（来自调研结论）：

- 命名修正条数：图里名字错了需要改配置文件多少次。如果一直很高，说明图对命名的自动理解不够好，或配置文件没设对。
- `validate` 通过率：用 `npx @coldtea/pr-lens-cli validate ...` 检查文档，一次通过的比例。反复不通过说明代理或配置有问题。
- 评审中的理解性问题数量：评审者问“这个改动到底改了哪块、数据怎么流”这类问题的次数。如果图真的有用，这类问题应减少。

OpenQodex 可观察指标（来自调研结论）：

- 报告是否退出码 2：三条完整性断言任一不满足就打“Review incomplete”并 exit 2。
- 每条扫描告警是否有理由：reviewer 被要求对每条告警给出“提升或带理由丢弃”。
- 每个改动行是否送到 reviewer 面前：在 brief 里、在 OpenQodex 后来的消息里，或对 Claude Code 而言在它读过的文件里。
- 报告是否同时输出终端和 `report.md`、`report.json`、`report.sarif`。

对抗审查可观察指标（来自调研结论的试用建议）：

- 真阳性数：入列问题中被人工确认为真实缺陷的数量（最重要的指标）。
- 误报率：入列问题中人工判定为误报的比例。若“双重检查”没起作用，误报率会很高。
- 重复/已知问题占比：入列的是否大多是已知或无关痛痒的问题。
- 核验有效性：被代理自己“双重检查”后剔除的问题里，事后看有没有本应保留的真缺陷（漏检）。
- 人工成本：逐条复核所花的时间，与不使用该流程相比是否下降。
- 对比基线：与“单次扫描、无子代理、无二次核验”的结果比，真阳性是否增加、误报是否减少。

试多久：Claude Code `/code-review` 原文没给建议时长；至少覆盖一批中等规模 PR 或改动的完整评审周期后再判断，不要只看一个 PR 或一次审查。PR Lens 和 OpenQodex 两个调研也没给建议时长；至少覆盖一批中等规模 PR 或改动的完整评审周期后再判断，不要只看一个 PR 或一次评审。对抗审查原文也没给建议时长；建议连续两三个仓库跑下来，若真阳性明显增加、误报可接受、人工复核时间下降，就可以把它固化成常规代码审查流程的一步；否则降级为“思路可借鉴”。

## 常见坑

- Claude Code `/code-review` 来源是个人推文，不是 Anthropic 官方文档；互动数据 likes 24、reposts 3、replies 2，属于小范围传播，不能作为功能有效性的证据。
- Claude Code `/code-review` 原文在“审代码”这一段后就截断了，开头声称的“按场景完整清单”其余部分不可见；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本。不要照猜语法，先查官方 `Commands - Claude Code Docs`。
- Claude Code `/code-review` 的“专找正确性 bug”“走云端深度审查”是作者对行为的概括，未附任何案例、命中率或对比数据。
- Claude Code `/code-review` 的 `--comment` 需要能把结果发到 PR，意味着要有对应 PR 的访问路径；`ultra` 走云端，意味着需要联网/云端算力。这两条是推断，原文没有明确说明，使用前请对照官方文档确认。
- Claude Code `/code-review` 如果误报率高到需要逐条反驳，或没有明显优于纯人工，就只保留在“知道有这条路”的层面，不写入手册主体。
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
- 对抗审查原文截断：编号 2 的提示词完全丢失，无法判断作者的完整流程是否还有别的关键步骤；不要凭猜测补写。
- 对抗审查无参数：原文没有说明项目规模、语言、模型配置、子代理数量、运行耗时、成本。
- 对抗审查列表载体未说明：原文没有说“已检查问题列表”是什么形式，需要你自己指定输出位置。
- 对抗审查自证偏差：“双重检查”由同一个模型完成，存在自我确认偏差的可能，原文未讨论；必须人工抽检或全检。
- 对抗审查能力依赖：仅适合已经有可读代码库、且所用代理工具支持子代理/子任务机制的场景；对没有子代理能力的工具，这条提示词的可执行部分会退化成一个普通的“找漏洞”指令。
- 对抗审查的“Ultra”“Astra 6”未解释：无法核实，也无法复用其配置；互动数据（约 402 赞、18 次转发、26 条回复）只能说明关注度，不能作为效果证据。
- 对抗审查的收益表述只是作者主张：“让我震惊”“一些真正令人惊叹的作品”没有任何输出样例、缺陷清单、修复前后对比或数据支撑。
- 四条路线关系：Claude Code 内置 `/code-review` 是代码审查命令，可在写码后、PR 前跑，也可 `--comment` 发到 PR；PR Lens 是 PR 阶段画图；OpenQodex 是 push 前评审；对抗审查是主动找漏洞；不互相替代，可叠加。若只能选一个，先按你的主要缺口选：已经在用 Claude Code 且想快速跑一遍审查用 `/code-review`，看不懂改动用 PR Lens，怕 push 前漏检用 OpenQodex，想主动找漏洞用对抗审查。

## 证据与来源

- 做法 S 依据调研报告 `@riba2534` 推文。报告给出的可照做内容包括：命令名 `/code-review`（别名 `/review`）、可选强度 low 到 max、`--fix` 直接修、`--comment` 发到 PR、`ultra` 走云端深度审查，以及原文附的 `Commands - Claude Code Docs` 链接卡片。
- 该推文报告明确指出的限制：来源是个人推文，不是 Anthropic 官方文档；互动数据为 likes 24、reposts 3、replies 2；正文在“审代码”这一段后就截断了，开头声称的“按场景完整清单”其余部分不可见；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本；`Commands - Claude Code Docs` 页面在材料中只有链接卡片，未抓取到正文。
- 做法 S 哪些只是作者主张：“专找正确性 bug”“走云端深度审查”是作者对行为的概括，未附任何案例、命中率或对比数据；`--comment` 需要 PR 访问路径、`ultra` 需要云端算力属于推断，原文没有明确说明。
- 做法 S 与已有清单的关系：不是新工具，而是已采纳工具 Claude Code 的内置 code-review 命令用法，属于对同一工具的能力细化；与清单条目不冲突，可作为“Claude Code 已 adopt”这一步的具体操作补充。
- 做法 A-I 依据调研报告 `coldteadotai/pr-lens`。报告给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式：GitHub App 安装地址、`npx skills add coldteadotai/pr-lens`、`.github/workflows/pr-lens.yml` 的 Action 配置、GitLab CI/CD 组件、Bitbucket pipe、CLI 的 `analyze` / `render` / `comment` / `validate` / `export` 命令、`.pr-lens/` 产物约定、`.github/pr-lens.yml` 改名修正。
- PR Lens 报告也给出了限制：Action 不保留状态、GitLab token 与媒体文件限制、Bitbucket fork PR 不触发、`.pr-lens/` 是临时目录只提交 map。
- PR Lens 哪些只是作者主张：README 中“对开源免费”“省事”“更好理解改动”等收益表述均为作者自述，报告没有给出对比或量化效果数据；抓取元数据显示仓库 1821 stars（来自抓取 metrics，非原文内容），只能说明关注度，不能证明省事。
- 做法 J-Q 依据调研报告 `openqodex/openqodex`。报告给出的可照做内容包括：`npx openqodex demo`、`npx openqodex init`、`npx skills add openqodex/openqodex`、`openqodex review` / `--all` / `<branch>` / `'#42'`、`openqodex review --reviewer codex`、`~/.openqodex/config.yaml` 的 `reviewer:` 与 `reviewer_web: off`、`report.md` / `report.json` / `report.sarif`、`.openqodex/config.yaml` 自定义扫描器、`npx openqodex trust`、`npx openqodex doctor --install`、`scanners.disable: [brakeman]`、`--offline`、`openqodex update --off` / `--rollback` / `OPENQODEX_AUTO_UPDATE=0`、`npx openqodex guide <topic>`。
- OpenQodex 报告给出的数据：13 个内置扫描器各自的版本、触发条件、下载体积（Apple Silicon / Linux x64 两列，例如 gitleaks 2.9 MB / 3.0 MB，osv-scanner 31.8 MB / 32.1 MB，hadolint 102.6 MB / 55.7 MB）。报告还提到首次运行实测条件是 Apple Silicon Mac、空工具目录、2 MB/s 带宽，但材料在此截断，未给出结果。
- OpenQodex 报告给出的限制：项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗自己的 Claude Code/Codex 额度；没有检出率、误报率、返工时间等效果数据；Codex 侧读取未被记录；Cursor 不能当 reviewer；Cline 也未列为 reviewer。
- OpenQodex 哪些只是作者主张：README 把它描述成“给 Claude Code 和 Codex 用的开源 AI 代码评审工具”，并给出“一条 `openqodex review` 会……”的流程说明；这些流程可照做，但收益没有量化对比。OpenQodex 的验收标准是流程完整性，不是检出率。
- 做法 R 依据调研报告 `@twostraws` 推文。报告给出了一条完整的、可复制的提示词（编号 1），提示词中明确规定的两个动作：使用任意多子代理；对返回的问题做双重检查后加入列表。报告明确指出原文截断，编号 2 提示词丢失，无法还原作者完整流程。
- 对抗审查哪些只是作者主张：“让我震惊”“一些真正令人惊叹的作品”——没有任何输出样例、缺陷清单、修复前后对比或数据支撑；“在 Ultra 上释放了 Astra 6”——未解释“Ultra”和“Astra 6”具体指什么，无法核实，也无法复用其配置；互动数据只能说明关注度，不能作为效果证据。
- 对抗审查主要局限：没有说明项目规模、语言、模型配置、子代理数量、运行耗时、成本；没有说明“列表”的载体和后续处置方式；“双重检查”由同一个模型完成，存在自我确认偏差的可能，原文未讨论；适用条件仅适合已经有可读代码库、且所用代理工具支持子代理/子任务机制的场景。
- 新旧做法差异：本次新增路线零（做法 S，Claude Code 内置 `/code-review`），不是替代前三条。Claude Code 内置命令面向快速代码审查，可在写码后、PR 前跑，也可 `--comment` 发到 PR；PR Lens 面向 PR 评审者，把 diff 画成架构/数据流图；OpenQodex 面向 push 前，跑扫描器加独立 LLM reviewer 并做完整性断言；对抗审查面向主动漏洞发现与误报控制。四者阶段不同，可叠加；若只能选一个，先按你的主要缺口选。

## 依据的调研

- [coldteadotai/pr-lens](../research/radar/2026-10-02/601-coldteadotai-pr-lens.md)：值得一试，建议选一个非关键仓库和一批中等规模 PR 做小范围试点：用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审，并用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。理由是该 README 给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式，但全部收益主张都只是作者自述，没有任何对比或量化效果数据。
- [openqodex/openqodex](../research/radar/2026-10-07/1814-openqodex-openqodex.md)：值得一试，可以在一台 macOS/Linux 机器上用 `npx openqodex demo` 加一个非关键仓库的 `npx openqodex init` 做小范围试用，按“报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前”三点验收；理由是它把“确定性扫描器 + 独立 LLM 评审逐条核对 + 完整性断言”做成了一条命令的流程，可复制的命令和配置原文都给全了，但项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。
- [@twostraws: 在当前的 Codex 重置狂热中，我在 Ultra 上释放了 Astra 6，它用一些真正令人惊叹的作品让我震惊。使用这些提示：](../research/radar/2026-10-09/2116-codex-ultra-astra-6.md)：值得一试，把这条“对抗性审查 + 子代理 + 双重核验后入列”的提示词直接拿到一个中小型代码仓库上试跑一遍，用真实缺陷命中率和误报率判断是否值得固化进审查流程；理由是原文给了一条可原样复制的提示词且内置了二次核验环节，但整条线索被截断、没有任何结果数据，只能小范围验证。
- [@riba2534: #claudecode Claude Code 里面内置了很多有用的功能，我以为是人人都知道,但好像很多人不知道。](../research/radar/2026-10-11/2564-claudecode-claude-code.md)：值得一试，下次在 Claude Code 里审代码时，直接用内置的 /code-review（别名 /review）并按其强度档位和 --fix/--comment 开关跑一遍，先小范围试，因为原文给出了可照输入的命令与参数，但正文被截断、具体拼接语法和前置条件缺失，需对照官方文档确认后再正式写入手册。
