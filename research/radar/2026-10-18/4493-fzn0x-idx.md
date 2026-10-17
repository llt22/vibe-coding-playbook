# fzn0x/idx

- 结论：**值得一试**。值得小范围试：照 README 把 idx 装起来并用 `idx mcp setup <客户端>` 注册进你已在用的 agent，用来验证「把现成 CLI 包成 MCP 工具供 agent 调用」这一模式是否真的省事；它本身是印尼股市工具，领域窄，先试流程而不是直接写进手册。
- 原文：https://github.com/fzn0x/idx
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-17T22:09:03.326Z

## 是什么

`fzn0x/idx`（安装包名 `ihsg-cli`，命令名 `idx`）是印尼股市（IDX / IHSG）的研究工具，单个 Rust 静态二进制，同时提供三种界面：给人看的终端表格、给脚本/程序用的 JSON 模式（`-o json`）、给 AI agent 的 MCP server（`idx mcp`，23 个工具）。

数据源全部免费、无需 API key：Yahoo Finance（行情、基本面、财报、分红）、MSN Money（行情、profile、分析师目标价）、IDX/KSEI 月度「>1% 股东」登记表（持股）、Indo Premier（IPOT）券商摘要（`idx bandar` 据此做印尼语所谓 bandarmology 的主力行为判读）、Kontan 与 CNBC Indonesia 的 RSS（新闻与词典法情绪）。每个来源在一个 `Provider` trait 之后，单一来源失效不会拖垮整个工具，`auto` 会用另一个来源补缺。

对本项目真正有价值的不是印尼股票本身，而是它把「一份数据、三种消费方」做成了一个可照抄的结构：CLI 表格 → 脚本 JSON → agent MCP，且同一份 JSON 贯穿三者。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：想验证「给 agent 供数据/工具」这一模式；印尼股市只是个具体场景。

1. 零安装先跑通（需要 Node/npm）：

```sh
npx github:fzn0x/idx stocks quote BBCA
```

2. 正式安装（四选一）：

```sh
cargo install ihsg-cli                    # crates.io，从源码构建，需 Rust 1.88+
npm install -g github:fzn0x/idx           # npm，直接从仓库安装
curl -fsSL https://raw.githubusercontent.com/fzn0x/idx/main/install.sh | sh   # Linux, macOS
```

Windows 无 npm 时从 releases 页下载 `idx-<version>-x86_64-pc-windows-msvc.zip`。npm 安装的是一个小的启动器，第一次运行 `idx` 会下载对应平台的预编译二进制并用 release 的 `SHA256SUMS` 校验。npm 12 需要加 `--allow-git=all`。

3. 用 JSON 模式对接脚本/agent（前提：已安装并在 PATH 上）：

```sh
idx -o json stocks quote BBCA | jq '.data[0] | {price, change_pct, pe_trailing, dividend_yield_pct}'
```

约定：stdout 只放一个 JSON 文档，其余全部走 stderr；envelope 里带 `provider`、`fetched_at`、`cached`、`stale`、`warnings`；来源没返回的字段是 `null`，不做估算。退出码有语义：`0` 正常、`2` 用法错、`3` 网络/来源错、`4` 未找到、`5` 离线缓存未命中、`6` 配置错。字段定义用 `idx schema quotes`（还有 `history`/`fundamental`/`bandar`/`ownership-*` 等）查看。

4. 启动 MCP server（本地 agent 用 stdio）：

```sh
idx mcp                            # stdio
idx mcp --http 127.0.0.1:8765 --token T --allowed-host '*'
idx mcp setup --list               # 列出所有支持的客户端
idx mcp setup codex                # 打印：codex mcp add idx -- /abs/path/idx mcp
idx mcp setup muse                 # 打印 Meta Muse Code 需要的 settings.json 片段
```

`idx mcp setup <client>` 会把二进制的**绝对路径**填进配置输出——README 明说理由是 GUI 应用通常不继承 shell 的 `PATH`。这是本线索里最可直接照抄的设计点：不要叫人手写路径。

5. 各客户端注册方式（README 给出的原样命令/配置，按你手上的工具挑一条）：

```sh
# Claude Code
claude mcp add --scope user idx -- idx mcp
# OpenAI Codex（CLI / IDE 扩展 / app）
codex mcp add idx -- idx mcp
# Gemini CLI
gemini mcp add -s user idx idx mcp
# GitHub Copilot CLI
copilot mcp add idx -- idx mcp
# VS Code（Copilot agent mode）
code --add-mcp '{"name":"idx","command":"idx","args":["mcp"]}'
# Factory Droid
droid mcp add idx "idx mcp"
# Qwen Code
qwen mcp add idx idx mcp
```

```json
// Claude Desktop: claude_desktop_config.json
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"]}}}
```

```json
// Meta Muse Code: ~/.config/muse/settings.json
{"schema_version": 1, "mcp_servers": {"idx": {"transport": "stdio", "command": "idx", "args": ["mcp"], "mode": "optional"}}}
```

```json
// Cline / Roo Code / Kilo Code：MCP Servers → Configure，type 必须为 stdio
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"], "type": "stdio"}}}
```

```json
// Cursor / Windsurf / JetBrains / Warp / Trae / Augment：粘贴到 MCP 设置里
{"mcpServers": {"idx": {"command": "idx", "args": ["mcp"]}}}
```

```json
// OpenCode: opencode.json
{"mcp": {"idx": {"type": "local", "command": ["idx", "mcp"], "enabled": true}}}
```

```json
// Crush: crush.json
{"mcp": {"idx": {"type": "stdio", "command": "idx", "args": ["mcp"]}}}
```

```toml
# OpenAI Codex 的配置文件写法：~/.codex/config.toml
[mcp_servers.idx]
command = "idx"
args = ["mcp"]
```

```yaml
# Continue: ~/.continue/mcpServers/idx.yaml（`idx mcp setup continue` 会打印）
```

- Zed：`settings.json` → `"context_servers": {"idx": {"command": "idx", "args": ["mcp"], "env": {}}}`
- Google Antigravity：`~/.gemini/config/mcp_config.json` → `mcpServers.idx`，`command` 用绝对路径，不要写 `type` 字段
- Kiro：`~/.kiro/settings/mcp.json`，或 `kiro-cli mcp add --name idx --command idx --args mcp`
- Goose：`goose configure` → Add Extension → Command-line Extension → `idx mcp`
- Mistral Vibe：`~/.vibe/config.toml` → `[[mcp_servers]]`，`name = "idx"`、`transport = "stdio"`、`command`、`args`

6. 只支持远程 URL 的产品（ChatGPT、Claude.ai、Perplexity、Devin、Manus）：把 HTTP 形态放在 HTTPS 隧道后面，再作为 connector 添加，请求头 `Authorization: Bearer T`：

```sh
idx mcp --http 127.0.0.1:8765 --token T --allowed-host '*'
# connector 地址：https://<host>/mcp
```

7. 离线/弱网（前提：之前至少成功取过一次，缓存按端点的 TTL 生效）：

```sh
idx --offline stocks quote BBCA     # 或 IDX_OFFLINE=1
idx cache stats
```

8. 让 agent 直接用工具（23 个工具，`idx_brief` 是一把起手的那个）：`idx_brief`、`idx_market`、`idx_quote`、`idx_history`、`idx_profile`、`idx_financials`、`idx_earnings`、`idx_dividends`、`idx_returns`、`idx_fundamental`、`idx_technical`、`idx_compare`、`idx_screen`、`idx_news`、`idx_sentiment`、`idx_broker`、`idx_bandar`、`idx_bandar_screen`、`idx_ownership_ticker`、`idx_ownership_entity`、`idx_ownership_changes`、`idx_ownership_foreign`、`idx_ownership_releases`。筛选示例：

```sh
idx stocks screen -f "pe<15,roe>15,sector=financial"
idx bandar screen --preset quiet-accumulation
idx bandar screen -f 'acc>=5,fpct>=5,gain<0'
```

README 给出的工具设计约束值得照抄：23 个工具用「每个 harness 都接受的那一子集」的类型化输入 schema（不用 nullable 类型数组，不用 `format`/`default` 关键字），每个工具配一段话描述；工具返回与 `-o json` 完全相同的 envelope，因此「学会 CLI 的 agent 就已经会用工具」；失败以工具错误返回 `{error: {code, message}, exit_code}`。

9. 让上游数据自动保持新鲜（README 描述的仓库自身做法，可迁移为「定时/状态触发的持续任务」范例）：GitHub Actions `ownership.yml` 在 08:17 / 14:17 / 20:17 WIB 抓取 IDX 页面、下载新的「Pemegang Saham di Atas 1%」工作簿、用 `idx` 导入验证可解析，并把文件和 `index.json` 发布到 `ownership-data` release；因为 idx.co.id 会拦截云网络（含 GitHub 自己的 runner），任务跑在自托管 runner 上（把仓库变量 `OWNERSHIP_RUNNER` 设为 `self-hosted`），跑在 GitHub runner 上时保留镜像并在最新登记表超过 45 天时变红。终端侧 Worker 每 30 分钟检查 `index.json`、校验 SHA-256、每分钟把一个 part 装进 D1，只在新月份全部行数到齐且数量匹配后才算「出现」；Worker 没有任何写端点。本地用 `idx ownership import --latest` 优先读 idx.co.id，被 Cloudflare 拒绝则从镜像下载并校验 SHA-256，`IDX_OWNERSHIP_SOURCE=mirror` 直接跳过 idx.co.id。

## 对应的研究问题

1. **能力发现**：可以交给 agent 的活被明确列了出来——批量报价、筛选全市场约 950 只股票、单票基本面/技术面（含逐条规则说明的判定）、财报与分红历史、收益与回撤、新闻与情绪、券商买卖前十名与「主力在吸筹还是派发」、个人/机构持股与月度变动。这些都是原本要人开多个网站或导 Excel 的活。`idx_brief` 被指定为「一次调用就能起手」的入口。
2. **任务匹配**：同一份数据三种界面——表格给人、JSON 给程序、MCP 给 agent；本地 agent 用 stdio，只支持 URL 的产品用 streamable HTTP。README 还体现了一种匹配原则：把工具集合限制在所有 harness 都能接受的 schema 子集内，而不是用满各家特性。
3. **条件供给**：无需 key 的数据源；`idx mcp setup <client>` 自动填绝对路径（明确说明 GUI 应用不继承 `PATH`）；`schema <name>` 给出每个 payload 的 JSON Schema，让 agent 知道字段语义；语义化退出码和 `{error:{code,message},exit_code}` 的错误形状，让 agent 能判断该重试还是改参数；`--offline` + 缓存让弱网下仍可作答。
4. **主动推进**：`ownership.yml` 的三个定时点、Worker 的「每 30 分钟检查索引 / 每分钟装一个 part」、`--latest`/`--all` 的自动导入与 SHA-256 校验、失败重试（IPOT 的 nginx 会成片返回假 404，工具按退避重试）——都是时间或状态触发并持续跑下去的具体形态。
5. **效果验证**：README 没有给出任何效果验证方法、准确率或对照实验。唯一可算「校准」的说法是 bandar 阈值以 2026 年 10 月成交最活跃的 40 只股票为基准设定，约一半单日读数为中性。因此这一条在本线索里证据最弱。

## 与已有做法的关系

- **Claude Code（adopt）**：README 给了 `claude mcp add --scope user idx -- idx mcp` 和 Claude Desktop 的 `claude_desktop_config.json` 写法。
- **OpenAI Codex（adopt）**：给了 `codex mcp add idx -- idx mcp` 与 `~/.codex/config.toml` 的 `[mcp_servers.idx]` 写法。
- **Cline（watch）**：MCP Servers → Configure，须写 `"type": "stdio"`。
- **Cursor（watch）**：把 `{"mcpServers": {"idx": {...}}}` 粘到 MCP 设置。
- **Google Antigravity（watch）**：`~/.gemini/config/mcp_config.json` 的 `mcpServers.idx`，要求绝对路径且不写 `type`。
- **goose（watch）**：`goose configure` → Add Extension → Command-line Extension → `idx mcp`。
- **OpenCode（watch）**：`opencode.json` 里 `"mcp": {"idx": {"type": "local", ...}}`。
- **GitHub Copilot（清单状态 drop）**：README 里仍有 `copilot mcp add idx -- idx mcp`（Copilot CLI）和 `code --add-mcp ...`（VS Code Copilot agent mode）两条，与本清单的判断不一致，可作为再评估线索。

## 证据与局限

**证据**：全部来自仓库 README（本次输入即 README 正文，抓取完整）。可核对的硬信息包括：四选一的安装命令、25 个客户端的注册命令/配置片段、23 个工具名、全局 flag 与对应环境变量、退出码表、命令表（含各命令的参数枚举，如周期 `1d 5d 1mo 3mo 6mo 1y 2y 5y 10y ytd max`）、数据源表（每个来源的用途/鉴权/注意事项）、bandar 阈值表、CI 定时点与 45 天告警、镜像的 SHA-256 校验流程。

**只是作者主张、未经验证**：

- 效果类说法（「省掉手工导入」「一个命令搞定」）没有任何量化。
- bandar 阈值是作者自述的启发式，样本只有 40 只股票、一个月，README 自己写明「heuristics, not advice」。
- 数据延迟：价格按来源所示延迟发布；Yahoo 的匿名 cookie+crumb、MSN 的公开 web key 都不是稳定契约。
- 文中示例输出（成交时间标为 2026-10-16）与阈值校准日期无法在本次调研中核实，应视为示意数据而非实测记录。
- 仓库仅 30 stars，无第三方评测、无用户案例、无 issue 佐证。

**适用条件**：只覆盖印尼股市（IDX/IHSG），Ticker 需 `.JK` 或省略后缀；依赖对非官方接口的抓取，来源随时可能变；持股数据依赖自托管 runner 才能稳定更新（云网络会被 idx.co.id 拦截）；明确声明不是投资建议，与研究用途和工具链用途分开看待。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 零安装跑通并看到 JSON：

```sh
npx github:fzn0x/idx stocks quote BBCA
npx github:fzn0x/idx -o json stocks quote BBCA | jq '.data[0].price'
```

2. 注册到你已经在用的那个 agent：

```sh
idx mcp setup --list       # 找到你的客户端
idx mcp setup <你的客户端> # 按打印出来的绝对路径配置执行
```

3. 在同一会话里给 agent 三个必须多步取数的问题，例如：「筛出 pe<15 且 roe>15 的金融股并按股息率排序」「BBCA 最近一个月是吸筹还是派发，说明用了哪些规则」「列出 BBCA 持股超过 1% 的股东里上个月有变动的」。

4. 手工对照：用网页或自己查数据做同样三个问题，记下耗时与每个数字能否追溯到来源。

5. 断网后重跑第 3 步中的一个问题，看 `--offline`/缓存是否还能给出带 `cached`/`stale` 标记的答案。

**判断有没有改善的指标**

- 任务完成时间 vs 手工方式（同一人、同一问题）。
- 人工纠正次数：agent 有没有用错工具或编造字段；正确时每个数字应能对上 envelope 的 `provider` + `fetched_at`，没取到的字段应为 `null`（README 明确不估算）。
- 工具调用是否正确：用 `-vvv`（或 `IDX_LOG`）看 stderr 里的逐条 URL。
- 新鲜度与可用性：`cached`/`stale` 标记比例、`--offline` 命中率、退出码分布（`3` 网络/来源错、`5` 离线未命中各占多少）。
- 失败可诊断性：出错时是否能从 `{error:{code,message},exit_code}` 直接判断该重试、改参数还是修配置。

**如果目的是把模式搬回自己的领域**，最小验证是：给自己的 CLI 先加 `-o json`（stdout 单文档、stderr 走日志、缺字段为 null、语义化退出码），再包一层 MCP，并写一个 `mcp setup <client>` 打印带绝对路径的配置；然后拿同一个任务在「有这层」和「没有这层」两种情况下让 agent 各做一遍，比上面的指标。
