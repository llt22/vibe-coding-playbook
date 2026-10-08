# fidipro/gluon

- 结论：**值得一试**。建议小范围试：在非关键仓库按 README 的安装命令安装，然后 cd your-repo && gluon 启动，让 intake agent 为同一任务推荐并对比不同 harness/model/effort，同时记录成本与上下文。理由是原文给出了可照做的安装与启动流程，并把任务匹配和成本/上下文可观测做成了产品能力，但 README 未展开 routing.yaml、权限配置和效果数据，需要自行验证。
- 原文：https://github.com/fidipro/gluon
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T17:34:29.381Z

## 是什么

Gluon 是一个面向编程智能体的控制平台：在同一个终端框架里并排运行 Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code，使用自己的 API key 或订阅。它主打两件事：（1）在单个 harness 内或跨多个 harness，为每次会话挑选最具性价比的 agent；Gluon 把 agent 定义为 harness × model × effort，先和你确定 spec，再按可配置规则路由。（2）管理智能体会话，提供成本与上下文可观测性和分析。仓库为 Apache-2.0，支持 Linux、macOS、Windows，原文显示 35 stars，有 CI 和 release。

## 具体做法

前提：已有至少一个受支持编程智能体的 API key 或订阅；使用 Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。以下步骤全部来自原文 README，routing.yaml 等细节原文指向文档站点，未在给定文本中展开。

1. 安装最新 release。Linux、macOS、WSL：

```sh
curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://github.com/fidipro/gluon/releases/latest/download/install.ps1 | iex
```

原文还给出 Bun/源码方式的线索：从 release 下载 npm 风格 tarball `gluon-<version>.tgz`，然后 `bun add -g "$PWD/gluon-<version>.tgz"`（Linux、macOS）；从 checkout 构建见 CONTRIBUTING.md。校验与所有安装选项见其 install guide。

2. 进入仓库并启动：

```sh
cd your-repo && gluon
```

3. 首次运行时按引导连接你的 agent。原文说首次运行会走一遍 connecting your agents，具体连接步骤在文档站点，给定的 README 未展开。

4. 描述这次会话是做什么的。intake agent 会读取你的仓库，问几个问题，并提出一个 agent、model 和 effort，以及一份 spec。

5. 按 Enter，在该 agent 自己的 UI 中启动会话，会话运行在 Gluon 的 frame 内。按一个键回到主界面，可以继续启动更多会话。

6. 路由与配置。原文说 Gluon 先和你确定 spec，再按可配置规则路由；Reference 文档中包含 CLI、config、`routing.yaml`、environment、models。给定文本没有给出 `routing.yaml` 的具体内容，因此需要配置路由时查其文档，不能照抄本文。

7. 会话管理。用 Gluon 查看各会话的成本与上下文可观测性和分析。原文没有给出具体命令或面板操作步骤。

8. 支持 harness：Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code；每个 harness 有一份指南，原文链接到 harness guides。

## 对应的研究问题

- 能力发现：原文只列出可并排运行的六种编程智能体，并说 intake agent 会根据会话目的提议 agent/model/effort；没有给出“AI 还能做哪些以前没想到交给它的工作”的新能力清单。
- 任务匹配：直接相关。Gluon 把 agent 显式定义为 harness × model × effort，并按可配置规则为每次会话路由，目标是在一个 harness 内或跨多个 harness 选择最具性价比的 agent。这适合把“什么任务交给什么模型、工具和 effort”变成可配置、可复用的规则。
- 条件供给：部分相关。原文提到需要提供仓库访问（intake agent 读 repo）、自有 API key 或订阅、首次运行的 agent 连接信息；会话运行在各 agent 自己的 UI 中。权限、工具供给、安全隐私的具体配置在原文中只出现在文档目录标题里，未展开。
- 主动推进：关系有限。原文的会话由“描述本次会话目的”启动，不是由时间、事件或状态自动触发；多会话并排和会话管理可支持人工持续切换与推进，但没有给出自动触发或持续完成的机制。
- 效果验证：相关。原文声明提供成本与上下文可观测性和分析，可用于比较不同 agent、模型、effort 的成本与上下文消耗；但没有给出质量评估指标、对照实验或案例数据。

## 与已有做法的关系

清单中有 Claude Code（adopt）和 OpenCode（watch）。Gluon 把这两个 harness 以及 Codex、Antigravity、Grok Build、Kimi Code 作为可并排运行和可路由的对象，相当于在已有单个编码智能体之上加一层编排、路由和成本/上下文管理。它不是替代 Claude Code 或 OpenCode，而是管理它们的会话和选择。清单中没有其他同类的多智能体编排/路由条目。

## 证据与局限

证据：README 提供了两个平台的安装命令、启动命令、支持的 agent 与平台列表、首次运行和启动会话的基本流程；仓库标注 Apache-2.0、CI、release，原文显示 35 stars。局限：给定文本是 README landing page，原文自己注明“detail lives in docs/”，因此路由规则 `routing.yaml` 的具体写法、权限与工具供给、安全隐私、成本分析示例、故障排查都不在材料中。原文没有给出任何效果数据、对比实验或用户案例；“选择最具性价比的 agent”“成本与上下文可观测性”目前只是作者/项目主张，未在原文中用数据支持。适用条件：已有受支持的编程智能体账号或 API key，能在本地仓库运行终端命令；需要自行查文档确认各 harness 连接方式与路由配置，并注意把代码库交给多个第三方 agent 时的权限与数据边界。

## 怎么试、怎么验证

最小试用：在一个非关键、已纳入版本控制的仓库中，按原文安装命令安装 Gluon，然后执行 `cd your-repo && gluon`。选一个边界清晰的小任务，先用默认/交互方式让 intake agent 推荐 agent/model/effort，记录它的 spec，再手动用第二个 harness 或模型做同一任务，比较结果。如果要从路由规则开始，需先查文档中的 `routing.yaml` 写法，不要照搬本文。验证指标：任务完成质量（人工评分、测试通过率或 review 意见数）、单位任务成本（token 或费用）、上下文占用、从任务描述到开始执行的耗时、会话间切换耗时、需要人工补问的次数。改善判据：在质量不明显下降的前提下，成本或上下文占用下降，或能更快、更稳定地为任务选对 harness/model/effort。先在低风险仓库小范围试，确认各 agent 的账号和数据权限后再扩大。
