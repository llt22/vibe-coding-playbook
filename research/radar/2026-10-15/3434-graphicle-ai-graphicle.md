# Graphicle-AI/graphicle

- 结论：**值得一试**。先在一个可回滚的真实仓库里照 README 跑通 brew 安装、`graphicle setup`、`graphicle doctor` 和 `graphicle ask`，人工核对返回摘录的文件行号是否准确，再决定是否常驻；理由是它把代码图谱与项目记忆用标准 MCP 一次性接进 Claude Code/Codex/Cursor 等现有智能体，安装、接入、自检、撤销的步骤在原文中完整可照做，但项目仅 0.1.0、只支持 macOS/Linux，速度与记忆的基准多为单次探索性运行。
- 原文：https://github.com/Graphicle-AI/graphicle
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T03:06:29.309Z

## 是什么

Graphicle 是一个用 Rust 写的单程序（Apache-2.0），把仓库映射成**代码图谱**（文件、函数、类、调用、导入，用 tree-sitter 解析，不调用模型），同时记住**项目记忆**（Markdown/PDF/Office/HTML 文档、审阅过的决策与流程、过去的 Claude Code 与 Codex 会话），并通过**一个 MCP server** 把两边的带引用摘录（精确到文件和行号，受 token 预算限制）提供给编码智能体。本地运行，无需 API key、无需账号、无遥测；数据存在单个 SQLite 文件里，默认监听 127.0.0.1。

官方声明可用客户端：Claude Code、Cursor、Codex、VS Code、Claude Desktop、任何 MCP 客户端。

## 具体做法

前提：macOS 或 Linux（README 明确 Windows 无原生构建；WSL2 下 Linux 安装"理应可行但尚未测试"）。准备一个可回滚的仓库或新分支，因为 `setup` 会改动仓库内文件（虽会先备份）。

1. **安装。** 有 Homebrew：
   ```sh
   brew install graphicle-ai/tap/graphicle
   ```
   没有 Homebrew：
   ```sh
   curl -fsSL https://github.com/graphicle-ai/graphicle/releases/latest/download/install.sh | sh
   ```

2. **在仓库里初始化接入。**
   ```sh
   cd your-repo
   graphicle setup
   ```
   它会：索引仓库、构建代码图谱、连接它发现的编码智能体、打开会话捕获、把 Claude Code 的搜索优先指向代码图谱、往 `AGENTS.md` 加一小节、安装保持项目最新的 Git hooks。它会列出每一个改动的文件，并先各自备份；`graphicle disconnect` 可全部撤销。加 `--yes` 可走非交互路径（原文的智能体安装提示词里用的就是 `graphicle setup --yes`）。

3. **（可选）让智能体替你装。** 把下面这段原样粘进 Claude Code、Codex 或 Cursor：
   ```text
   Install Graphicle with `brew install graphicle-ai/tap/graphicle` (or, without Homebrew,
   `curl -fsSL https://github.com/graphicle-ai/graphicle/releases/latest/download/install.sh | sh`),
   then run `graphicle setup --yes` in this repository and list every file it changed.
   ```

4. **让智能体用起来。** 对智能体说 "use graphicle to find where failed requests are retried"，或在终端直接问：
   ```console
   $ graphicle ask "where is tax added to prices?"
   Evidence for "where is tax added to prices?"
   4 excerpts · 598 of 3,000 tokens

   [1] shop/pricing.py:1-7  price_with_tax()
       """Prices and tax."""
       TAX_RATE = 0.2


       def price_with_tax(price):
           """A price with the sales tax added."""
           return round(price * (1 + TAX_RATE), 2)
   ```
   未配置模型时 `ask` 只显示证据；要生成成文答案需：
   ```sh
   graphicle config set model anthropic
   ```
   （或 `openai`、`ollama`；本地模型走 Ollama 或任何 OpenAI 兼容服务。）

5. **做影响面分析（改一个符号会牵动什么）。**
   ```sh
   graphicle graph extract . --code-only
   graphicle graph affected "retry()"
   ```
   前提：`--code-only` 提取不需要模型；不带 `--code-only` 的完整提取会把文档和图片发给它找到的 LLM API key 对应的服务。

6. **浏览与批准记忆。**
   ```sh
   graphicle open
   ```
   浏览器里看图谱、来源和记忆；智能体提出的记忆要在这里等你批准。

7. **自检。**
   ```sh
   graphicle doctor
   ```

8. **跨仓库检索（工作区）。**
   ```sh
   graphicle context --workspace
   ```
   或用 workspace MCP endpoint（见 README 指向的 docs/mcp.md）。

9. **撤销。**
   ```sh
   graphicle disconnect
   ```
   移除 setup 添加的内容；每个被改的文件此前已备份为 `<file>.graphicle-bak`。

10. **各客户端被接入的位置（人工核查用）：** Claude Code → 仓库内 `.mcp.json`，会话捕获 hooks 在 `.claude/settings.local.json`；Codex → `~/.codex/config.toml`，hooks 在 `~/.codex/hooks.json`（Codex 会要求你信任它们）；Cursor → `~/.cursor/mcp.json`（无会话捕获）；VS Code → 仓库内 `.vscode/mcp.json`；Claude Desktop → 设置目录里的 `claude_desktop_config.json`；其他 MCP 客户端 → 一段短 JSON 条目。

11. **数据位置与边界。** 数据文件夹：macOS `~/Library/Application Support/Graphicle`，Linux `~/.local/share/graphicle`；`graphicle graph extract` 把图谱文件写到项目的 `.graphicle/`。默认项目上限 100,000 个文本文件、1 GiB 文本，可调（docs/configuration.md#limits）。`sync` 尊重 `.gitignore`、跳过 `.env`/密钥/凭据；会话捕获丢弃 `<private>…</private>` 片段并脱敏凭据。

## 对应的研究问题

**1. 能力发现。** 原文给出的、以前不太会交给 AI 的具体能力：向编码智能体提供"某处实现+文档+决策"的带引用摘录（`graphicle ask`、MCP tools、`graphicle context`），以及符号级影响面查询（`graphicle graph affected "retry()"`）、符号解释与路径追踪、导出可交互 HTML 图谱（`graphicle graph`）。

**2. 任务匹配。** 明确的组合方式：检索/图谱部分用本地确定性工具（tree-sitter，不用模型，不花 token），回答用智能体自己的模型读摘录——README 明确"工具不调用模型，是你的智能体的模型在读这些摘录"。需要成文答案时再单独配 anthropic / openai / ollama。MCP 工具沿用 Graphify 的工具名（`query_graph`、`get_neighbors`、`shortest_path`）并排在记忆工具旁边。

**3. 条件供给。** 核心就是给智能体补上三类上下文：代码图谱、项目文档/决策/流程、历史会话；每段摘录带文件与行号，并在 token 预算内返回。需要授予的权限/改动：`setup` 会改 `.mcp.json`、`.claude/settings.local.json`、`AGENTS.md`、Git hooks、`~/.codex/config.toml` 等，并先备份。记忆由智能体提出、人工在 app 中批准后才生效；记忆与它所属的函数绑定，代码改了记忆会过期。

**4. 主动推进。** 触发机制：Git hooks 在每次 commit、merge、checkout 后同步；每次回答前同步你刚改动的少数文件；会话捕获自动保存每个已完成的 turn；新会话以你审阅过的记忆加最近若干 turn 开场（"无需重新解释"）。

**5. 效果验证。** 原文提供：`graphicle doctor` 自检（示例输出为 18 项通过、1 项警告"未设置答案模型"）；每条摘录可回溯到文件与行号；会话/记忆删除会给出哈希链式删除凭据。性能侧给出 Kubernetes（31k 文件）代码提取 3 分 18 秒 vs Graphify 0.9.88 的 26 分 38 秒（各一次探索性运行、同一台 16 CPU Linux、8 workers，两者建成同一张图：256,329 节点、1,400,392 边）、Django 上预发布版 7.5 秒 vs Graphify 0.9.77 的 72.8 秒（五次交替运行取中位数）；记忆侧与七个记忆系统对比，注册先于评分、用同一个开源模型作所有系统的 reader 和 judge，预发布版在三个开发集上"不落后"。

## 与已有做法的关系

- **Claude Code（adopt）**：`graphicle setup` 会在仓库 `.mcp.json` 里接上 Graphicle，并在 `.claude/settings.local.json` 装 hooks 做会话捕获，同时把 Claude Code 的搜索优先指向代码图谱。这是与现有 adopt 条目直接叠加的增强。
- **Cursor（watch）**：接 `~/.cursor/mcp.json`，但不做会话捕获。
- **Graphify（watch）**：Graphicle 的代码图谱引擎是 Graphify 的 Rust 移植，随 Graphify 版本保持同步并在文件头与 NOTICE 中署名；原文提供 docs/migrate-from-graphify.md，`graphicle setup` 会主动询问是否切换某个仓库，逐文件备份，且**从不删除 `graphify-out/`**。也就是说 Graphicle 在已有 Graphify 上是叠加迁移关系，而非替代性冲突。

## 证据与局限

**原文给出的实证内容：** 一段真实终端输出（`graphicle ask` 返回 4 条摘录、598/3000 tokens，第一条定位到 `shop/pricing.py:1-7` 的 `price_with_tax()`）；一个 setup 演示 GIF 的描述（同步、建图、发现 5 个客户端、连接并列出改动文件；`doctor` 18 项通过 + 1 项警告）；上面两组速度数据与一组记忆对比。

**主要是作者主张、证据较弱的部分：** 速度对比是"各一次探索性运行"，且 0.1.0 引擎用的是"release 源码的 Linux 测试构建"，与 Graphify 0.9.88 不是同一构建路径；记忆对比原文只写"在三个开发集上不落后"，正文没有给出具体分数、数据集名称和读者/评判模型，细节被推到 docs/benchmarks.md；"记忆绑定到代码符号、其他地方编辑通常不影响"给了规则链接但正文未展开。

**适用条件与风险：** 平台仅 macOS 与 Linux（Windows 原生无构建，WSL2 未测试）；版本仅 0.1.0，团队版还在私有预览；默认单项目 10 万文件 / 1 GiB 文本的上限；`setup` 会写多个仓库内与家目录配置（虽备份并可用 `disconnect` 撤销）；`ask` 的成文答案需要另配模型，本地模型可行但未给质量数据；`graphicle graph extract` 不限于本地时会把文档和图片发给配置的 LLM。

## 怎么试、怎么验证

**最小试用（半天内可完成）：**
1. 挑一个中等规模、有 README 与若干设计文档、你对其实现细节熟悉的真实仓库，开一个新分支。
2. 安装 + `graphicle setup`，记录它列出的每一次文件改动与备份位置（`<file>.graphicle-bak`）。
3. 跑 `graphicle doctor`，记录通过项与警告项。
4. 跑 `graphicle graph extract . --code-only` 与 `graphicle graph affected "<某个你已知的核心函数>()"`。
5. 跑 5–10 个你有标准答案的问题，例如 `graphicle ask "where is tax added to prices?"`，逐个核对返回摘录的**文件与行号是否真的包含答案**、是否漏掉了你已知的相关文件。
6. 对同一个仓库让智能体回答同一批问题，比较接入前后。
7. 跑 `graphicle disconnect`，用 `git status` 确认工作区回到干净状态。

**判断是否改善的指标：**
- `doctor` 通过项数与警告含义（例如是否只是"未设置答案模型"这类无害警告）。
- 摘录定位准确率：人工核对返回片段的文件:行号命中率、是否出现无关文件。
- 漏检率：`graph affected` 是否覆盖你已知的全部调用点。
- 智能体侧：完成同一任务时的重读文件数、工具调用次数、首答正确率、token 消耗是否落在预算内。
- 会话连续性：结束一次会话后再开新会话，是否还需要重新解释项目背景（README 声称的"无需重新解释"）。
- 可逆性：`disconnect` 后 `git status` 是否干净、配置文件中新增条目是否被移除。

任一项不达标（例如摘录经常定位错误、`disconnect` 留有残留），就停在"小范围试"，不要推广到主力仓库。
