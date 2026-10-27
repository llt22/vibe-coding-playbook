# lemonadesaltbagel/veil

- 结论：**值得一试**。建议在受控的测试仓库中小范围试用：用 veil 代理 Claude Code/Codex 等编码智能体，把本地数据库、fixture、git 和代码 schema 中的真实值先做确定性假名化，再用 capture/audit 验证外发请求零泄露。理由是 README 给出了可复制的安装、初始化、MCP 数据库工具和审计命令，但项目仍是 alpha，且云厂商路径未对真实云账户验证，不适合直接全量采用。
- 原文：https://github.com/lemonadesaltbagel/veil
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-27T06:07:04.040Z

## 是什么

veil 是面向编码智能体的本地隐私代理，位于本机 `127.0.0.1:8787`，在请求离开机器前把真实姓名、邮箱、电话、地址、ID、密钥替换为确定性假名；智能体在本地执行命令、读文件、改文件或查数据库时，veil 再按工具策略把真实值安全还原。README 明确支持 Claude Code、Codex CLI、Aider、Continue、OpenAI SDK、LiteLLM，以及通过 `dsh-veil` 插件支持 DeepSeek Harness。项目当前标记为 alpha，PyPI 包名为 `veil-proxy`，Apache-2.0。

## 具体做法

1. 前提：Python 3.11+ 或使用 Homebrew；代理必须运行；README 明确说明「你的机器是可信的」，vault、智能体本地转录和本地遥测仍持有真实数据。安装：

```sh
pip install veil-proxy
pip install 'veil-proxy[postgres]'
# 或 macOS/Linux
brew install lemonadesaltbagel/veil/veil
```

2. 在项目里初始化并接入 Claude Code。`veil init` 会从 `.env*` 中的数据库 URL、SQLite 文件、fixture 目录、git 历史和代码中的 Prisma/Django/Rails/SQLAlchemy/OpenAPI/protobuf 字段里发现真实值并种子化；写入 git-ignored 的 `.claude/settings.local.json`；`--mcp` 还会注册只读数据库工具。前提是代理随后要处于运行状态。

```sh
veil init ~/code/myapp --mcp
veil service install
veil status ~/code/myapp
cd ~/code/myapp && claude
```

3. 手工补充或刷新数据源。前提是你能提供只读连接串或本地 fixture 路径；不要把不必要的数据源都接进来。

```sh
veil seed postgresql://user@localhost/app ./fixtures git:.
veil seed --schema ~/code/myapp
veil sources
```

4. 其他客户端按 README 指向代理。Claude Code 可直接设 base URL；Aider/OpenAI SDK/LiteLLM 用 OpenAI 兼容入口；Codex CLI 用 Responses API 配置；DeepSeek Harness 用插件启动 veil。

```sh
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
```

```sh
export OPENAI_BASE_URL=http://127.0.0.1:8787/v1
```

```toml
[model_providers.veil]
base_url = 'http://127.0.0.1:8787/v1'
wire_api = 'responses'
```

```sh
dsh plugin --profile headless add dsh-veil
```

5. 日常使用时保持原来的工作方式，只按需切换显示和分享模式。`veil display tokens` 用于投屏/演示，让回答继续显示假名；`veil share` 在把文本贴到别处前把真实值换成假名；`veil reveal` 在本地把假名换回真实值。

```sh
veil display tokens
veil display real
veil share bug-report.txt
veil reveal notes.txt
veil quasi warn
```

6. 需要让智能体查库时，用只读 MCP 数据库工具。它支持 SQLite、Postgres、MySQL/MariaDB、SQL Server 的 `query`、`list_tables`、`describe_table`，以及 MongoDB 的 `collections`、`find`、`aggregate`、`count`。智能体用假名查询，veil 把字符串字面量里的假名替换成绑定参数，真实值不作为 SQL 文本出现；默认 100 行、最大 500 行，30 秒超时。手工注册方式：

```sh
veil mcp-db --source N
claude mcp add veil-db --scope local -- veil mcp-db --source N
```

7. 验证时先抓取实际外发请求，再跑仓库自带审计。`veil proxy --capture DIR` 会把每个请求按离开机器时的样子写入目录；`veil audit` 需要仓库 checkout 和 `uv` 环境。

```sh
veil proxy --capture DIR
cd prototype
uv run veil audit
uv run python -m veil_dev.redteam
uv run python -m veil_dev.shellfuzz --cases 10000
uv run python -m veil_dev.mcp_e2e
uv run python scripts/eval_ai4privacy.py
```

8. 团队场景可选：只共享假名密钥，不共享 vault key；管理员可用 managed-settings 强制 Claude Code 走 veil。前提是有 secrets manager 或受保护的 passphrase 分发方式。

```sh
veil team export --to aws-sm://veil/team
veil team join --from aws-sm://veil/team
veil team managed-settings --port 8787
```

## 对应的研究问题

- 能力发现：原文主要不是发现全新的模型能力，而是让编码智能体可以接触此前因隐私不便提供的生产形态数据，例如带真实客户信息的日志、fixture、数据库和 bug 报告。README 的真实会话示例中，模型在只看假名的情况下仍定位到 invoice 293 被重复扣款，说明「查真实数据并修 bug」这类工作可以在假名化后交给智能体。
- 任务匹配：适合文本型编码、日志排查、数据库只读查询、fixture 处理和本地文件编辑；明确支持 Claude Code、Codex CLI、Aider、Continue、OpenAI SDK、LiteLLM 和 DeepSeek Harness。数据库工具适合只读查询；第三方自由文本需要可选 NER 模型；图片截图不扫描；未知语言的代码转义不保证；按假名片段搜索（如 `LIKE '%ab12%'`）不能匹配真实数据。
- 条件供给：这是该线索最直接回答的问题。需要提供项目数据源（`.env*` 数据库 URL、SQLite、fixture、git 历史、代码 schema）、运行中的本地代理、OS keychain 或 `VEIL_VAULT_KEY`/`VEIL_TOKEN_SECRET`、MCP 数据库注册、可选的 NER 模型，以及团队假名密钥分发。权限上，数据库工具只读，Edit/Write 只还原目标文件中已存在的值，网络型命令永远拿不到真实值；反馈上可用 `veil status`、`veil sources`、`veil display`、`veil proxy --capture` 和 `veil audit`。
- 主动推进：`veil service install` 让代理在登录时后台启动；它会观察数据库写计数器、表统计、MongoDB op 计数器和文件时间，数据源变化后在后台增量重新种子化，新客户在下一次请求时即被假名化。这属于状态触发的隐私维护，不是任务规划型主动推进。
- 效果验证：README 给出 `veil audit`、`--capture`、redteam bypass matrix、shellfuzz、MCP 端到端、scale 和 pilot 等验证手段；指标包括外发请求中的真实值泄露数、任务是否仍成功、代码中是否残留假名、缓存命中率和延迟。

## 与已有做法的关系

清单中有 Claude Code、DeepSeek、DeepSeek Harness。veil 与它们是集成关系：Claude Code 有 quick start、`veil init` 和 managed-settings 强制走代理；DeepSeek 在 README 中被用作真实模型会话和 live API 测试对象；DeepSeek Harness 通过 `dsh-veil` 插件接入，属于插件式支持而非原生能力。清单中没有其他相关条目。

## 证据与局限

README 自报了大量测试数据：在 1,000 条 ai4privacy 自由文本上，纯正则匹配漏过 80.4%，正则加专用 PII NER 漏过 17.6%，从自有数据种子化的 veil 漏过 1.8%；四组真实智能体会话共 39 个模型请求、463 个真实值，0 泄露，后续又加 32 个请求仍为 0；21 种单命令绕过变换 21/21 被拦截或完全脱敏；35 个 shell/SQL 注入测试中 23 个在无保护时失败、35 个在有保护时通过；68,000 个随机嵌套命令模糊测试中 0 次执行代码；真实仓库 pilot 种子化 39,650 个值，任务成功、0 泄露、代码中 0 假名。它还报告了 74–89% 的缓存命中、约 8 ms 脱敏加 11 ms guard、1.2M 种子值时 37+68 ms 和 1.1 GB 内存。

但这些主要是作者自建 harness 的自报结果，不是独立第三方评测；仓库仅 32 stars，项目状态为 alpha。明确局限包括：本机可信；智能体可能发明未预见的变换；短于 8 字符的值只做逐字或编码匹配；常见单词形式的独立姓氏不单独种子化；第三方自由文本需额外 NER；跨多行的稀有准标识符组合不处理；未知语言代码转义不保证；图片不扫描；Bedrock、Vertex、Microsoft Foundry 和 Claude Platform on AWS 只用真实 CLI 对 fake upstream 验证，尚未对真实云账户验证；片段搜索无法命中真实数据。适用条件是本地开发、文本型编码任务和可控制的数据源，不适合把该工具当成完整 DLP 或生产多租户隔离方案。

## 怎么试、怎么验证

最小试用：选一个含少量真实或仿真 PII 的测试仓库，使用独立 vault 和端口，不要直接上生产密钥。

```sh
VEIL_HOME=~/.veil-trial veil init ~/code/testapp --mcp --port 8788
veil service install
veil status ~/code/testapp
veil proxy --capture ~/.veil-trial/capture
```

然后跑一个边界清楚的任务，例如「查 invoice 重复扣款并修测试」，同时记录：

- 泄露：在 `--capture` 目录中搜索已知真实姓名、邮箱、卡号、地址、密钥，命中数必须为 0；`uv run veil audit` 报告应为 0 泄露。
- 任务效果：与不带敏感数据的基线任务比较，测试是否通过、诊断是否正确、所需轮次是否明显变差。
- 代码污染：最终 diff 中假名残留数应为 0；记录误报替换次数。
- 数据库工具：用假名查询能返回正确行；写入、`$out`、`$merge`、多语句和伪名片段搜索应被拒绝或解释。
- 故障行为：停掉代理后请求应失败关闭，不应把原始数据直发出去。
- 成本：记录请求延迟、缓存命中率和本地内存占用，确认团队可接受。

判断标准建议设为：已知真实值外发命中为 0、任务成功率不低于基线、代码中无假名残留、数据库只读策略生效、延迟和内存可接受。任一真实值泄露即停止试用并回到 study。
