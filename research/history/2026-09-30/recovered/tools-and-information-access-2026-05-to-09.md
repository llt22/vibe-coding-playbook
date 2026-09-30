# 工具、办公交付与信息获取：五月至九月的讨论

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及提问所在项目的限制只属于当时上下文。

本次整理提示：沙箱旧回答中的“主机零接触”“放心开”等表述不能作为安全保证；MiniMax 的 API 依赖判断、ego 的性能数字、各平台访问规则和插件维护状态均未重验。采集是否可用取决于实际环境与权限，历史建议不等于当前授权。

## OMP 与 Pi 的取舍（05-22）

### 历史 AI 回答 · 原会话第 86 行

来源：`~/.codex/sessions/2026/05/22/rollout-2026-05-22T12-40-20-019e4dfb-fd66-70d0-b92d-9f38c0efdfd9.jsonl:86`。

**结论**

按“`oh-my-pi` 相比原版 `Pi` 有啥优势”理解：`oh-my-pi` 的核心优势是开箱即用、工具链更全、自动化更强；原版 `Pi` 的优势是极简、可控、社区体量更大。

**事实依据**

截至 2026-05-22 我查到：

- `oh-my-pi` 是 `Pi` 的 fork，README 明确强调“batteries-included”，内置更多 provider、工具、LSP/DAP、MCP、subagent、浏览器自动化等能力。
- `oh-my-pi` 安装页提供 `curl -fsSL https://omp.sh/install | sh`，也推荐 `bun install -g @oh-my-pi/pi-coding-agent`。
- `Pi` 当前主仓库是 `earendil-works/pi`，官方文档强调极简：默认只有 4 个工具，并且刻意不内置 permission popups、plan mode、subagents、todo lists、background bash 等复杂功能。
- GitHub API 当前数据：`oh-my-pi` 约 5.9k stars / 482 forks，最新版 `v15.2.2`；`Pi` 约 52.6k stars / 6.3k forks，最新版 `v0.74.2`。

**oh-my-pi 的优势**

1. **更像完整产品**
   不只是 Pi 的轻量 agent runtime，而是直接集成编码常用能力：搜索、编辑、LSP、调试、GitHub、PDF/网页读取、浏览器自动化、MCP、子任务代理等。适合“装完就想拿来干活”。

2. **编码场景能力更密**
   README 标注了 LSP 操作、DAP 调试操作、`ast_edit`、`hashline` 精准编辑、review/commit/merge-conflict 相关工具。这些对真实项目改代码比纯文本编辑更有优势。

3. **模型/provider 支持更激进**
   它强调 40+ provider、OAuth、订阅计划、本地模型、role-based model routing、fallback、round-robin keys。适合你想混用 Claude/Gemini/OpenAI/本地模型，或者按任务角色切模型。

4. **迁移成本低**
   它会读取/兼容多种已有 AI 工具配置，例如 Claude、Cursor、Codex、Roo、Kilo、VS Code 等配置。对已经折腾过一堆 agent 配置的人比较省事。

5. **更适合“少搭框架，多跑任务”**
   如果目标是日常写代码、读仓库、跑命令、查网页、调试、拆任务，`oh-my-pi` 的默认能力覆盖面明显更广。

**Pi 的优势**

1. **更简单、更可审计**
   Pi 官方刻意保持小核心，默认只有少量工具。你知道 agent 能做什么、不能做什么，安全边界更容易理解。

2. **社区和主线更大**
   当前 `Pi` 仓库 stars/forks 明显高于 `oh-my-pi`。长期维护、问题搜索、生态跟进上，主线项目风险更低。

3. **更适合自己搭 agent**
   如果你想把 Pi 当成底层 agent runtime，自定义包、工具、上下文和权限模型，原版 Pi 的极简设计反而是优点。

4. **攻击面更小**
   `oh-my-pi` 工具多、自动发现配置多、MCP 集成多，便利性更强，但误操作和供应链风险也更高。原版 Pi 默认面更窄。

**我的建议**

- 你只是想用：选 `oh-my-pi`，优势更直接。
- 你想研究 agent 架构、自己控制工具边界：选 `Pi`。
- 工作项目里试用：优先用隔离目录/容器，安装脚本不要盲目 `curl | sh`，更建议用包管理器安装或先审脚本。

来源：[oh-my-pi README](https://github.com/can1357/oh-my-pi#installation)、[Pi README](https://github.com/earendil-works/pi)、[Pi 官方说明](https://pi.dev/)、[Pi 迁移公告](https://pi.dev/news/2026/5/7/pi-has-a-new-home)

## MiniMax Office Skills（06-02）

### 历史 AI 回答 · 原会话第 41 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-06-01T09-08-03-773Z_019e8270-b03d-7000-897c-616b38ef0991.jsonl:41`。

看了，这几个 office 相关的 skill 是：

| Skill | 功能 | 特点 |
|-------|------|------|
| `minimax-pdf` | 创建、填写、重排 PDF | 15 种封面风格，自动推导排版配色 |
| `pptx-generator` | 创建、编辑、读取 PPT | 基于 PptxGenJS，支持 XML 编辑工作流 |
| `minimax-xlsx` | 创建、读取、分析、编辑 Excel | 支持公式重算、pandas 分析、专业财务格式 |
| `minimax-docx` | 创建、编辑、排版 Word 文档 | 基于 OpenXML SDK，支持模板和 XSD 验证 |

**潜在价值**
- 如果你经常需要程序化生成 office 文档（报表、合同、演示文稿），这些 skill 能省不少事
- 功能描述比较全面，覆盖了常见的文档处理场景

**风险点**
- **Beta 状态**：README 明确说 API 可能随时变更，稳定性未知
- **依赖 MiniMax API**：需要 API 密钥，可能有成本和调用限制
- **实际效果未知**：没有看到社区反馈，质量待验证
- **与现有工具重叠**：对于简单的 office 操作，可能不如直接用 python-docx、openpyxl 等库直接

**建议**
如果你有具体的 office 文档处理需求，可以先试用一下看效果。但不建议作为核心依赖，毕竟还是 Beta 状态。

你有具体的 office 文档处理场景吗？我可以帮你评估是用这些 skill 还是其他方案更合适。

## Semble 与代码搜索（06-30）

### 历史 AI 回答 · 原会话第 496 行

来源：`~/.codex/sessions/2026/06/30/rollout-2026-06-30T15-14-14-019f1760-e8b9-7ad1-ad11-7c98f36b6801.jsonl:496`。

看了，`MinishLab/semble` 很值得作为第一候选，比我刚才提的 Lumen 更贴近我们当前实验。

项目：[MinishLab/semble](https://github.com/MinishLab/semble)

**它是什么**

`semble` 明确定位是：

```text
Fast and Accurate Code Search for Agents
```

也就是给 Claude Code、Cursor、Codex、OpenCode 这类 coding agent 用的代码搜索层。README 里说它可以作为 MCP server、CLI 或 sub-agent 使用，并且支持 Codex 集成。

**为什么适合我们**

它正好踩中我们当前想验证的问题：

```text
不要让主模型 grep + read 大量文件
先用一个语义检索层返回少量相关代码片段
再让主模型核验和执行
```

它的几个关键点很合适：

- 本地运行，不需要 API key、GPU 或外部服务。
- 支持 CLI：`semble search "authentication flow" ./my-project`
- 支持 MCP，能给 Codex / Claude Code 等 agent 调用。
- 支持本地路径和 Git URL。
- 支持 `.gitignore` / `.sembleignore` 控制索引范围。
- 默认搜 code，也可以搜 docs、config、all。
- 返回的是具体 chunk、文件路径、起止行，而不是只给摘要。
- 使用 tree-sitter 做 code-aware chunks。
- 检索组合是 semantic embedding + BM25 + RRF 融合，再加代码感知 rerank。
- Python 包，MIT license，`pyproject.toml` 标的是 Beta，Python `>=3.10`。

**和我们方向的关系**

这个项目不是“便宜模型召回”，而是更工程化的一层：

```text
确定性/轻量语义索引层
```

它可以放在我们的实验矩阵里：

```text
rg 基线
semble 语义搜索
便宜模型召回
主模型源码核验
```

甚至它可能成为“传统工具先缩小范围”的升级版：

```text
rg / semble 初筛 -> 小模型或主模型核验 -> 结论
```

**需要谨慎的点**

README 里的指标很强，比如“98% fewer tokens”“~250ms indexing”“~1.5ms query”“99% transformer retrieval quality”，这些先当项目自述，不能直接采信。我们要用自己的目标仓库和问题复测。

另外，它不是完整项目共识层，也不是 NotebookLM / Code Wiki。它只解决一件事：

```text
让 agent 更快、更省 token 地找到相关代码片段。
```

这正好适合作为我们代码语义检索实验的第一步。

**我的判断**

可以把 `semble` 作为当前第一候选。它比 SeaGOAT 更活跃、更贴近 agent 场景，也比 Milvus / 向量库方案轻很多。

下一步建议不是马上接 MCP，而是先跑 CLI 对比：

```text
semble search "采购预算控制相关代码" /path/to/repo --top-k 10
rg 关键词检索
便宜模型召回
```

然后记录命中率、噪音、是否能找到入口/hooks/DocType/文档。

## Agent-Reach 与信源接入（08-09）

### 历史 AI 回答 · 原会话第 8457 行

来源：`~/.codex/archived_sessions/rollout-2026-08-09T12-03-49-019fe4b0-f1a0-7981-8522-5e85fe351829.jsonl:8457`。

有用，但更适合作为“信源接入方案参考库”，不适合直接成为另一项目的生产依赖。现在整体安装进 Docker，收益小于复杂度。

关键判断：

- Agent-Reach 不是统一采集 SDK。它的核心是安装外部 CLI、检查可用性、告诉 Agent 应该执行什么命令。
- 它的 MCP 只提供 `get_status`，不能直接搜索或读取 Reddit、小红书、Twitter。
- 各平台返回结构不统一，另一项目仍然要自己做数据转换、去重、时间处理、证据保存和失败重试。
- 它依赖 OpenCLI、浏览器扩展、Cookie、Node CLI 等组件，不适合我们当前无人值守的云端 worker。
- MIT 许可证，可以参考或复用具体实现。

对我们的实际价值如下：

| 能力 | 价值 | 判断 |
|---|---:|---|
| Reddit | 低 | 仍然必须登录态；桌面走 Chrome，服务器走 Cookie，没有解决 24 小时部署问题 |
| Product Hunt + Jina Reader | 中 | 实测能绕过页面 403，拿到完整产品说明和 Launch 内容；但当前官方 GraphQL 已能拿 description 和评论，不应替换官方 API |
| V2EX 公共 API | 中 | 热门、帖子详情、回复实测可用；但节点列表请求出现 403，而且会进一步加重技术内容占比 |
| RSS | 中 | 思路有用，但实现只是检查 `feedparser`，我们自己接入更简单 |
| 小红书/Twitter/Instagram | 低 | 都依赖浏览器登录态或 Cookie，不适合云端无人值守 |
| YouTube/B站字幕 | 中低 | 后续做资讯、内容研究 Lens 时有价值，现在引入过早 |
| 多后端健康检查 | 中 | 设计值得参考，但当前另一项目信源数量不需要引入完整能力层 |

现场验证结果：

- Jina Reader 读取 Product Hunt Basedash 页面返回 200，成功拿到产品说明、Launch 正文、排名、图片和团队信息。
- V2EX 热门主题、单帖详情、回复接口返回 200。
- V2EX 按节点获取最新帖子接口本次返回 403，不能直接视为稳定信源。
- Reddit 源码明确写明“没有零配置路径”，必须使用 OpenCLI 或 `rdt-cli` Cookie。

我的建议是：

1. **不要安装 Agent-Reach，也不要加入另一项目依赖。**
2. **保留它作为信源技术选型参考。**
3. **Product Hunt 继续使用官方 GraphQL**；Jina Reader只适合以后做失败后的人工验证或补充正文，不进入默认自动采集。
4. **暂时不加 V2EX 默认信源**，因为我们当前更需要解决内容过度偏技术，而 V2EX 会让问题更严重。
5. 后续做“资讯研究”“中文社区”“视频内容”这些新 Lens 时，再分别抽取它的 Jina、RSS、B站和小红书方案，不整体接入。

所以当前不需要改代码。它验证了我们之前对 Reddit 的判断，也给后续多媒体和中文信源阶段提供了一份不错的路线图。

## PRAW 与无人值守采集前提（08-10）

### 历史 AI 回答 · 原会话第 8607 行

来源：`~/.codex/archived_sessions/rollout-2026-08-09T12-03-49-019fe4b0-f1a0-7981-8522-5e85fe351829.jsonl:8607`。

PRAW 对我们有用，而且如果 Reddit 批准 API 权限，它是目前最适合另一项目线上无人值守采集的实现，比 Cookie、浏览器接管和 Agent-Reach 更稳定。

但关键是：**PRAW 只是 Reddit API 的 Python 封装，不提供或绕过 API 权限。**

核对结果：

- 项目成熟：2010 年开始维护
- 当前版本：`8.0.2`，2026 年仍在更新
- BSD-2-Clause 许可证，可用于项目
- 自动处理 OAuth、分页、评论树和限流
- Reddit 免费 Data API 限额为每个 OAuth Client ID 每分钟 100 次，足够另一项目使用
- 只读采集只需要：
  - `REDDIT_CLIENT_ID`
  - `REDDIT_CLIENT_SECRET`
  - 唯一且明确的 `REDDIT_USER_AGENT`
- 不需要保存 Reddit 账号密码或浏览器 Cookie

真正的门槛是 Reddit 当前实行审批制。PRAW 文档还链接旧的 `prefs/apps` 页面，但 Reddit 最新官方规则要求先申请 Data API：

https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=14868593862164

申请时应明确说明：

- 非商业或当前免费项目
- 只读取公开帖子和评论
- 用于发现、整理用户公开表达的需求
- 不训练模型
- 不发帖、点赞、私信或执行账号操作
- 低频定时采集
- 保留原帖链接和来源归属

还有一个重要成本不是额度，而是合规：Reddit 要求已经删除的帖子、评论和用户信息也从本地数据中删除，并建议在 48 小时内同步处理。另一项目当前是长期保存卡片和来源摘录，所以正式接入时需要增加删除复查机制，不能只写一个 PRAW 抓取函数。

我的建议：

1. 先申请 Reddit Data API，不安装 PRAW。
2. 获批后使用 PRAW 做正式生产信源。
3. 先定向采集具有明确需求表达的社区，而不是扫整个 Reddit。
4. 同时实现删除同步、来源链接和作者信息最小化。
5. 验证内容质量后再加入默认每小时调度。

因此，PRAW 的技术选型是正确的；当前阻塞点是 Reddit 审批，不是代码实现。

## Docker Sandboxes（08-10）

### 历史 AI 回答 · 原会话第 97 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-08-10T16-18-22-819Z_019fec77-cfe3-7000-abd1-45801ef9664d.jsonl:97`。

**Docker Sandboxes = 给 AI 编程 agent（Claude Code、Codex、Gemini CLI、OpenCode 等）跑的本地隔离沙箱，用 microVM 隔离，让 agent 能"放开干"而不碰你的主机。**

## 核心作用

解决一个矛盾：agent 干活需要权限（装包、改配置、跑服务、起容器），但给了权限又怕它乱来。Sandboxes 的做法是**不管 agent，管墙**——每个 agent 跑在独立的 microVM 里，只挂载你的项目目录，文件系统和网络都受控。主机不受影响，不需要人工审批，`--dangerously-skip-permissions`（YOLO 模式）也能放心开。

## 关键点

- **隔离级别**：microVM，比普通 Docker 容器隔离更硬（有独立内核边界），但比开整台 VM 轻、启动快
- **用完即弃**：agent 跑完一条命令销毁沙箱，可重复创建
- **能跑 Docker**：沙箱内部还可以再起容器（嵌套）
- **支持 agent**：Claude Code、Gemini CLI、Copilot CLI、Codex、OpenCode、Kiro，也可自定义
- **不依赖 Docker Desktop**：macOS 装法是 `brew install docker/tap/sbx`（CLI 工具），Windows 用 winget
- **团队管控**：配合 Docker AI Governance 做组织级网络/文件系统策略

## 和你相关的点

你现在的场景（Paseo + 我这类 agent 直接在你 Mac 上跑命令）正是它针对的问题——agent 要自由执行，但安全和失控风险要兜住。Paseo 目前是 agent 直接跑在你的宿主机上（daemon 管理进程），Docker Sandboxes 可以看作另一种执行环境：把 agent 的 shell 圈进 microVM，主机零接触。

适用判断：如果你担心 agent 跑危险命令（删文件、改系统配置、污染环境），或者想让多个 agent 并行跑互不干扰、跑完不留垃圾，值得试；代价是 microVM 启动/文件挂载的额外开销，以及沙箱内环境和你本机不完全一致（有些依赖本机环境的活会变别扭）。

需要的话我可以帮你装一个（`brew install docker/tap/sbx`）看下实际用法。

## Qwen 多模态插件（08-10）

### 历史 AI 回答 · 原会话第 116 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-08-10T16-18-22-819Z_019fec77-cfe3-7000-abd1-45801ef9664d.jsonl:116`。

读完了。**这是通义（QwenLM）官方的多模态插件包：给任何 agent harness（Claude Code、Codex、Gemini CLI、opencode 等）装上原生多模态能力——读图/视频/文档/3D/音频，外加生成和 3D 建模驱动。**

## 核心构成

每个能力 = 一个 **skill**（让模型知道工具有哪些）+ 可选 **MCP server**（工具本体，`uvx` 按需拉起，不用手动 pip）。7 个能力：

| 能力 | 干什么 | 形式 |
|---|---|---|
| core | 基础视觉：动态分辨率读图/视频/文档/3D、OCR、grounding、分割、ASR、看图对话、web search | skill + MCP |
| video-memory | 长视频问答（分层图记忆，2 小时视频也能按时间点回答） | skill + MCP |
| omni-av | 音视频理解：ASR 带时间戳/说话人、时序描述、事件计数、音乐标注 | skill + MCP |
| video-edit | 视频编辑/生成（图像/视频/音频生成） | skill + MCP |
| blender | 驱动**运行中的** Blender 建模/材质/灯光/渲染（22 个工具） | skill + MCP |
| freecad | 驱动运行中的 FreeCAD 参数化 CAD（14 个工具，STEP/STL/FEM） | skill + MCP |
| edu-agent | 数学/科学题生成中文讲解视频（仅 skill） | skill only |

## 亮点和注意点

- **亮点**：动态分辨率读取——4K 截图的小字、缩略图都自动缩放到 VL 模型的 patch grid，不用手动 resize；一条 `install.sh` 跨 6 个 harness 统一安装
- **注意**：这是阿里系生态——工具类能力（OCR/grounding/ASR/生成/视频记忆）需要 **`DASHSCOPE_API_KEY`**（阿里云百炼），web search 需要 `SERPER_API_KEY`；系统依赖要 `ffmpeg`，可选 libreoffice/blender/texlive/chromium
- **不用 key 的**：基础读图/读视频帧/读文档（模型原生视觉能力）

## 和你的关联

你的智能审查项目如果让 agent 看截图、读文档、分析视频，这个插件能给 Paseo 管的那些 agent（codex/claude/opencode）统一补上多模态工具链——**不受限于某个 harness 是否自带视觉**。但要先想清楚两件事：

1. 你用的模型本身有没有视觉（比如 Claude 就有）？如果有，增量主要是视频/长文档/音频这类专业处理，不是基础读图
2. 要用工具类能力就得有阿里云百炼的 key——你愿意把审查数据走阿里云吗？这是数据路径的决策

要我拉一下某个能力的 cookbook 看具体工具列表和实际效果，还是先这样？

## tgrep 与大仓搜索（09-07）

### 历史 AI 回答 · 原会话第 211 行

来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:211`。

**结论：值得试，但定位是“大仓高频搜索加速器”，不是 `ripgrep` 的完全替代。**

`tgrep` 用三元组索引 + 本地 TCP server 查询，大仓里重复搜索会明显受益；README 也说明它已集成到 GitHub Copilot CLI 用于大仓搜索。用法是先 `tgrep index .`，再 `tgrep serve .`，之后 `tgrep "pattern" .` 自动连 server。它的 benchmark 是“索引已建好后的搜索耗时”，这一点要记住：首次建索引仍有成本。官方数据里 18 个平台/仓库组合赢了 17 个，Kubernetes on Linux 是接近持平且 `rg` 略快。来源：README、Benchmark

我本地浅克隆后跑了：

```bash
cargo test --workspace --locked
```

结果通过，合计 794 个测试通过，包括 CLI、索引、watcher、并发搜索、ripgrep 兼容、损坏索引读取等。CI 也配置了 fmt、clippy，以及 Linux/macOS/Windows 三平台测试，还有每周 fuzz `trigram/query/ondisk/reader`。代码成熟度比普通新工具强。

主要注意点：

- 默认跳过超过 `64 MiB` 的文件，这和 `rg` 不同；需要完整一致性时用 `--no-max-filesize`。
- `-E/--encoding`、`-a/--text`、`--binary`、`--hidden`、`--no-ignore*` 等会绕过索引直接扫文件。
- 小仓库、一次性搜索、返回海量匹配时优势会变小。
- 安装优先用 Homebrew：`brew install tgrep`，当前 Homebrew stable 是 `1.0.4`；源码安装则按 README clone 后 `cargo install --path tgrep-cli --locked`。

建议你在当前项目里先这样试：

```bash
brew install tgrep
tgrep index . --exclude node_modules --exclude .next --exclude dist
tgrep serve .
tgrep "你常搜的关键词" . --stats
```

我没跑大型 benchmark，所以结论覆盖的是构建/测试健康度和代码设计，不覆盖你机器、你仓库上的真实性能。

## SoL-Pi 与上下文成本（09-13）

### 历史 AI 回答 · 原会话第 897 行

来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:897`。

结论：`NVlabs/SoL-Pi` 做的是 **Pi coding agent 的降本增效扩展**，不是新的通用 AI 编程工具。它解决的问题很具体：**长任务里 Agent 反复发上下文、反复读大日志、编辑后还要再开一轮跑测试，导致 token 和模型轮次浪费。**

仓库自己也写明：它是 Pi 的 standalone extension，不是 Pi 官方发行版；目标是减少 repeated model turns、context replay、oversized observations 和长日志读取，同时不跳过验证。([SoL-Pi README](https://github.com/NVlabs/SoL-Pi))

**它加了四个机制**

- **Action Fusion**：把“改文件”和“改完后跑测试/构建/检查”合成一次工具调用，少一次模型往返。
- **ObservationPack**：大工具输出第一次完整给模型，后续替换成 handle；需要时用 `obs_recall` 分页取回，避免大日志每轮都塞进上下文。
- **Evidence-Preserving Reducer**：长测试/构建日志先归档，再让 reducer model 提取关键证据；只有引用能和原始日志逐字匹配才接受，失败就回退原始输出。
- **Online Context Compact**：任务计划某一步完成后，根据上下文压力和 cache 成本判断是否触发 Pi 原生压缩，压缩后自动继续任务。

**用户是谁**

主要用户不是普通开发者，而是：

- 已经在用 `Pi` 的重度 coding-agent 用户；
- 做 Agent harness / CLI / runtime 的工程师；
- 关心 token 成本、长任务成功率、上下文治理的人；
- 做 AI coding agent 研究、评测、自动化循环的人。

如果你用的是 Codex、Claude Code、Cursor，它不能直接给这些工具通用安装。它依赖 Pi 的 extension API 和 Pi 运行时。Pi 本身是一个 agent harness 项目，包含 coding agent CLI、agent runtime 和统一多模型 API。([Pi README](https://github.com/earendil-works/pi))

**它不解决什么**

- 不帮团队分发 rules/skills/MCP，那是 `teamai-cli` 那类工具；
- 不提供多 Agent 产品后端，那更像 `fastclaw` 的方向；
- 不提升模型智能本身；
- 不适合普通个人轻量使用；
- 不适合不使用 Pi 的团队直接落地。

**风险点**

- 它不是 sandbox。安全文档明确说它以 Pi 进程权限运行，不是权限边界。([SECURITY.md](https://github.com/NVlabs/SoL-Pi/blob/main/SECURITY.md))
- `Action Fusion` 会让模型请求的 shell 命令在文件修改后自动执行。
- `Evidence-Preserving Reducer` 开启后可能把诊断日志发给配置的 reducer model；它有疑似密钥检测，但文档也说这不是完整 secret scanner。
- 所有机制默认关闭，需要通过 `sol-pi.json` 显式开启，这是合理设计。

**成熟度判断**

我本地在临时目录验证了：

```bash
npm ci --ignore-scripts
npm run check
```

结果：TypeScript 通过，18 个测试文件、139 个测试通过，`npm pack --dry-run` 也通过。`npm ci` 报 2 个 moderate 级漏洞。

但它仍是很新的项目：GitHub 显示仓库创建于 **2026-09-02**，当前版本 `0.1.0`，没有 GitHub release，安装方式是 `pi install git:github.com/NVlabs/SoL-Pi`。适合试验和研究，不适合直接当稳定基础设施依赖。

**我的判断**

这个项目的价值在于：它把 Uber 那篇文章里讲的“减少无价值 token 和模型轮次”做成了 Pi 上可插拔的实验实现。方向是对的，工程质量看起来不差，但适用面很窄。

如果你不是 Pi 用户，现在不用急着装；更值得借鉴的是它的设计思路：**大日志不要反复进上下文，编辑后验证要合并，长任务要在完成边界压缩，上下文优化必须保留可追溯证据。**

## ego-lite 初次介绍（09-17）

### 历史 AI 回答 · 原会话第 28 行

来源：`~/.claude/projects/-WebstormProjects-private-project/7764a962-7a2b-41a7-8c5b-b5d469e3ee80.jsonl:28`。

## ego-lite 概览

**Citro Labs** 做的一个 **AI 原生 Chromium 桌面浏览器**，专门给 AI 编程代理（Claude Code、Codex、Cursor 等）做浏览器自动化用的。16.1k stars，MIT 协议。

### 核心卖点

1. **Spaces 隔离机制** — 每个 Agent 在独立的 Space 里操作，用户正常浏览不受干扰，可同时跑 10+ 个 Agent 并行。
2. **代码式交互而非 CLI 逐步调用** — Agent 直接写 JavaScript 片段（snapshot / fill / click / navigate / capture），一次性执行多步操作，比逐条 CLI 调用省 token、快 2.5 倍。
3. **Page Snapshot** — 对页面（含深层 iframe）生成高保真结构化文本，让纯文本 LLM 也能"看到"网页。
4. **Chrome 数据迁移** — 首次启动可导入 Chrome 的 cookie、登录状态、扩展和书签，Agent 直接复用已登录会话。
5. **数据本地存储** — 不上传浏览数据。

### 技术架构

- 浏览器引擎：定制 Chromium（目前 macOS，Windows beta）
- Agent 集成层：Node.js / JS npm 包 `ego-browser`
- 多 Agent 兼容：通过 `.claude/skills`、`.codex/skills` 等目录注册 skill

### 与本项目的关系

如果你想在 DE12 项目中让 AI Agent 自动化操作浏览器（比如自动化测试、数据抓取、流程演示），这个工具可以考虑。不过它目前主要面向 macOS，且侧重"Agent 辅助浏览"场景，和常规的 Playwright/Puppeteer 自动化测试定位不同。

需要我深入看它的某个具体部分（比如 skill 集成方式、Snapshot 实现、或评估是否适合你的场景）吗？

## Paseo 插件目录（09-17）

### 历史 AI 回答 · 原会话第 17 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-17T10-40-12-923Z_01a0aef3-de7b-74b1-a513-149bfefbeb95.jsonl:17`。

项目里已装 Paseo 0.8.0，`gh` 可用。这个名单已归档（社区迁到 `paseo-cafe/paseo-cafe`），但插件本体仍可直接安装。按你的用法（几十个并行 agent、probes/smoke 大量子代理、自有 skills、macOS daemon、多 provider）排序：

## 强烈推荐

| 插件 | 理由 |
|---|---|
| **agent-monitor** (`omercnet/paseo-agent-monitor`) | 一个面板列全 daemon 所有 agent，Attention/Running/Idle 分桶 + 项目分组 + 文本过滤 + 归档清扫。直接回答"这 38 个 agent 哪个需要我"，最适合你的多代理工作负载 |
| **workspace-activity** (`ABorakati/paseo-workspace-activity`) | 工作区内实时的子代理树、工具调用检查、steering/取消、todo 进度。"启动 agent → 观察子代理树"这个循环你天天在做 |
| **skills** (`gpambrozio/paseo-plugins --path skills`) | 列出会话可用的 skills/commands、渲染 SKILL.md、在活会话上直接调用。你自己维护了 7 个项目专用 skill，这个直接增强你的 skill 工作流 |

## 值得装（有 gh，且你重度多 provider）

- **usage-monitor** — 34 家 provider 的配额/余额/限流卡片 + 从本地 transcript 重算 token 成本。你跨多个 provider 路由，成本可视化有实际收益
- **github-board** — issues/PR 四列视图，卡片可"Send to chat"直接在工作区起 agent。适合 review-heavy 的工作流（你的 probes 里就有 title-review、invoice-review）
- **pr-radar** — PR 按"需要你/处理中/待外部/就绪"分组，配提醒动作。若你常收外部 PR 可考虑

## 可选

- **reasoning-display** — reasoning 块换成可折叠 Markdown 卡片（0.7.0-beta.2+，你 0.8.0 满足）
- **defer** — 延迟投递消息给 agent（等会话空闲再触发新回合）
- **launchd-jobs** — macOS 专用，cron 排 shell 命令，daemon 不跑也生效
- **主题**（dracula / monokai-pro）— 纯外观

## 不建议

- **pi-tasks-timeline**、**opencode-session-overview** — 绑定特定 provider（Pi/OpenCode），你这边没迹象要用
- **github-workbench** 与 github-board 二选一即可，功能重叠，board 的"起 agent"集成更贴你的流程

**风险提醒**：插件是无沙箱的本地代码（daemon 机全权限），装前值得扫一眼源码；API 还在演进，装时建议 pin tag（`--ref`），避免更新破坏。`paseo plugin status` 可查更新。

要我现在装其中某几个吗？
