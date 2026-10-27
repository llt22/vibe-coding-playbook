# 在编码智能体接触真实数据前，先做本地假名化并验收零泄露

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把私有名称、客户数据、数据库、日志与 fixture 交给编码智能体前，用本地层把真实值替换为确定性假名并在工具执行时还原，再用捕获与审计确认外发请求里没有已知真实值。
> 先试这一步：先选一个含少量仿真 PII 的测试仓库，用独立 vault 和端口跑一遍 veil 的最小试用，在 `--capture` 目录搜索已知真实值、命中数必须为 0，再决定是否扩大范围。
> 最近修订：2026-10-27

## 解决什么问题
在把私有名称、客户数据、数据库、日志与 fixture 交给编码智能体前，先用本地层把真实值替换为确定性假名，并在本地工具执行时按策略还原；再用状态、捕获和审计确认模型侧看到的是假名、外发请求里没有已知真实值。它解决的是“既要让智能体接触真实形态数据，又不想把真实值发出去”的边界问题，不是通用 PII 兜底。

## 适用与不适用
适用：
- 本地开发、文本型编码、日志排查、只读数据库查询、fixture 处理、本地文件编辑；希望让 Claude Code、Codex CLI、Aider、Continue、OpenAI SDK、LiteLLM、DeepSeek Harness 等编码智能体接触生产形态数据，但先做假名化。
- 做法 A（claude-my-privacy）：只需要对配置过的私有名称/公司信息做词条级别名替换的 Claude Code 用户；已验证 macOS + Claude Code 2.1.290。
- 做法 B（veil）：需要按数据源自动发现/种子化真实值，覆盖姓名、邮箱、电话、地址、ID、密钥等多类值，并需要只读数据库 MCP、capture/audit 的团队或个人。

不适用：
- 把任一工具当完整 DLP、生产多租户隔离或通用 PII 检测器。
- 指望保护未配置词条（A）或未支持内容（B）；veil 明确不扫描图片截图、不保证未知语言代码转义、不处理跨多行稀有准标识符组合，片段搜索如 `LIKE '%ab12%'` 不能命中真实数据。
- 把 veil 当成熟方案：项目 alpha，云厂商路径只用真实 CLI 对 fake upstream 验证，尚未对真实云账户验证。
- 把本机当不可信环境：veil 的前提是“你的机器是可信的”，vault、智能体本地转录和本地遥测仍持有真实数据。
- 需要明确开源许可证或二次分发合规性的场景用 A 要谨慎：A 项目尚无开源许可证，清单标注 `UNLICENSED`；B 为 Apache-2.0。

## 前置条件
做法 A：
- `claude` 命令可用；在仓库根目录执行命令。
- 真实信息只能写在仓库之外；配置目录权限 `700`，配置文件权限 `600`。
- 已验证组合：macOS + Claude Code 2.1.290。

做法 B：
- Python 3.11+ 或使用 Homebrew；本地代理必须运行。
- 需要可用的项目数据源：`.env*` 中的数据库 URL、SQLite 文件、fixture 目录、git 历史、代码中的 Prisma/Django/Rails/SQLAlchemy/OpenAPI/protobuf 字段等；只接入必要数据源。
- OS keychain，或 `VEIL_VAULT_KEY` / `VEIL_TOKEN_SECRET`；团队场景需要 secrets manager 或受保护的 passphrase 分发方式。
- 需要数据库工具时，提供只读连接串并注册 MCP；需要验收时准备仓库 checkout 与 `uv` 环境。

## 操作步骤

### 先选做法
- 只需要对少量配置词条做别名替换，选做法 A；它更轻，不跑代理，但不是通用 PII 检测器，也没有 capture/audit。
- 需要从数据库、fixture、git、代码 schema 自动种子化，覆盖多类 PII，或需要只读数据库 MCP 与外发请求审计，选做法 B；它更完整，但仍是 alpha，且要求本机可信。
- 两者机制不同：A 是 Claude Code 插件做“配置词条级别名替换 + 工具执行前还原”；B 是本地代理做“确定性假名化 + 工具策略还原”。不要因为装了 A 就认为 B 的覆盖面已被覆盖。

### 做法 A：claude-my-privacy 的词条别名替换
1. 创建私有配置（先用虚构示例）
前提：在仓库根目录；`claude` 命令可用。下面的复制命令不会覆盖已存在的文件。
```sh
mkdir -p "$HOME/.config/claude-my-privacy"
chmod 700 "$HOME/.config/claude-my-privacy"
if [ ! -e "$HOME/.config/claude-my-privacy/mappings.json" ]; then
  cp -n examples/mappings.example.json "$HOME/.config/claude-my-privacy/mappings.json"
fi
chmod 600 "$HOME/.config/claude-my-privacy/mappings.json"
```
预期结果：仓库外生成 `mappings.json`，目录权限 `700`、文件权限 `600`。示例配置使用的虚构映射为：陈星河 → 陈瑞恩，`chenxinghe` → `ryanchen`，云杉智科 → 海岚数科，`cedarbyte` → `harborwave`。格式、大小写处理与别名选择见 `docs/user/configuration.md`。

2. 安装插件
前提：仍在仓库根目录，`claude` 命令可用。
```sh
claude plugin marketplace add "$PWD" --scope user
claude plugin install my-privacy@my-privacy-marketplace --scope user
```
预期结果：插件以 `--scope user` 用户级安装。注意：`install.py` 会额外改动插件顺序、禁用指定的 compaction 插件、写入遥测相关设置；日常安装请用上面的 CLI 命令。

3. 确认配置生效
在 Claude Code 会话里依次执行：
```text
/reload-plugins
/my-privacy-status
```
判定标准：
- 配置非空且加载成功时，状态里出现 `Configuration: loaded`，且 `mappings` 计数大于 0；
- `loaded; mappings: 0` 表示词条列表为空（等于没保护）；
- `unavailable` 或 `invalid` 表示替换未生效。
各状态的处理步骤见 `docs/user/troubleshooting.md`。注意：状态命令不显示词条列表，插件也没有常驻状态栏。

4. 用虚构邮箱做端到端验证
前提：已按第 1–3 步完成配置和加载。
做法：发一条含虚构邮箱 `staff42@cedarbyte.example` 的请求，让模型回显它，再让 Write/Bash 用它落一个文件，观察两侧显示的差异。
预期结果：模型侧看到的是 `staff42@harborwave.example`，而真正执行工具时被还原为 `staff42@cedarbyte.example`。插件还会尝试还原 Write、Edit、Bash 写文件时用到的执行参数；支持的助手回复显示会尝试展示原文，但不修改已存储的会话文本或模型上下文。

5. 换成真实信息
前提：第 4 步端到端验证通过。
做法：把真实信息写进 `$HOME/.config/claude-my-privacy/mappings.json`（仓库外），然后重新执行 `/reload-plugins` 和 `/my-privacy-status`。
预期结果：状态仍为 `loaded` 且 `mappings` 计数大于 0。注意：插件每次加载只读一次配置，所以每次修改私有配置后都要重新执行 `/reload-plugins`，再用 `/my-privacy-status` 检查。

6. 日常使用与诊断
照常输入请求、照常使用工具即可。诊断用 `/my-privacy-audit`，它只保留结构性元数据，不含命令或正文文本。

7. 更新
前提：更新源码并递增插件版本后。
```sh
claude plugin update my-privacy@my-privacy-marketplace --scope user
```
然后在活动会话里再次执行 `/reload-plugins` 和 `/my-privacy-status`。注意：源码目录即 marketplace 安装源，运行副本在 Claude 插件缓存中；如果移动了源码目录，需要重新注册 marketplace 路径。

### 做法 B：veil 的本地假名化代理
1. 安装
前提：Python 3.11+ 或使用 Homebrew。
```sh
pip install veil-proxy
pip install 'veil-proxy[postgres]'
# 或 macOS/Linux
brew install lemonadesaltbagel/veil/veil
```
预期结果：`veil` 可用；需要 Postgres 支持时再装 `postgres` extra。

2. 在项目里初始化并接入 Claude Code
前提：代理随后要处于运行状态。
```sh
veil init ~/code/myapp --mcp
veil service install
veil status ~/code/myapp
cd ~/code/myapp && claude
```
`veil init` 会从 `.env*` 中的数据库 URL、SQLite 文件、fixture 目录、git 历史和代码中的 Prisma/Django/Rails/SQLAlchemy/OpenAPI/protobuf 字段里发现真实值并种子化；写入 git-ignored 的 `.claude/settings.local.json`；`--mcp` 还会注册只读数据库工具。预期结果：`veil status` 能看到项目状态，Claude Code 走本地代理。

3. 手工补充或刷新数据源
前提：你能提供只读连接串或本地 fixture 路径；不要把不必要的数据源都接进来。
```sh
veil seed postgresql://user@localhost/app ./fixtures git:.
veil seed --schema ~/code/myapp
veil sources
```
预期结果：`veil sources` 列出已接入的数据源；新增数据源后可再次种子化。

4. 其他客户端按 README 指向代理
Claude Code 可直接设 base URL；Aider/OpenAI SDK/LiteLLM 用 OpenAI 兼容入口；Codex CLI 用 Responses API 配置；DeepSeek Harness 用插件启动 veil。
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
预期结果：对应客户端请求先到 `127.0.0.1:8787`，再由代理转发。

5. 日常使用：显示、分享、还原
保持原来的工作方式，只按需切换显示和分享模式。
```sh
veil display tokens
veil display real
veil share bug-report.txt
veil reveal notes.txt
veil quasi warn
```
`veil display tokens` 用于投屏/演示，让回答继续显示假名；`veil share` 在把文本贴到别处前把真实值换成假名；`veil reveal` 在本地把假名换回真实值；`veil quasi warn` 作为准标识符警告命令按需启用。预期结果：展示和分享时不带真实值，本地需要时再还原。

6. 让智能体查库：只读 MCP 数据库工具
前提：已注册 `--mcp` 或手工注册；使用只读连接。
```sh
veil mcp-db --source N
claude mcp add veil-db --scope local -- veil mcp-db --source N
```
它支持 SQLite、Postgres、MySQL/MariaDB、SQL Server 的 `query`、`list_tables`、`describe_table`，以及 MongoDB 的 `collections`、`find`、`aggregate`、`count`。智能体用假名查询，veil 把字符串字面量里的假名替换成绑定参数，真实值不作为 SQL 文本出现；默认 100 行、最大 500 行，30 秒超时。预期结果：用假名能查到正确行；写入、`$out`、`$merge`、多语句和伪名片段搜索应被拒绝或解释。

7. 验证：先捕获实际外发请求，再跑审计
前提：`veil proxy --capture DIR` 会把每个请求按离开机器时的样子写入目录；`veil audit` 需要仓库 checkout 和 `uv` 环境。
```sh
veil proxy --capture DIR
cd prototype
uv run veil audit
uv run python -m veil_dev.redteam
uv run python -m veil_dev.shellfuzz --cases 10000
uv run python -m veil_dev.mcp_e2e
uv run python scripts/eval_ai4privacy.py
```
预期结果：在 capture 目录搜索已知真实姓名、邮箱、卡号、地址、密钥，命中数必须为 0；`uv run veil audit` 报告应为 0 泄露。任一真实值泄露即停止试用。

8. 最小试用（建议先做）
前提：选一个含少量真实或仿真 PII 的测试仓库，使用独立 vault 和端口，不要直接上生产密钥；以下按原文命令。
```sh
VEIL_HOME=~/.veil-trial veil init ~/code/testapp --mcp --port 8788
veil service install
veil status ~/code/testapp
veil proxy --capture ~/.veil-trial/capture
```
然后跑一个边界清楚的任务，例如“查 invoice 重复扣款并修测试”，同时记录：泄露、任务效果、代码污染、数据库工具、故障行为、成本。判断标准建议设为：已知真实值外发命中为 0、任务成功率不低于基线、代码中无假名残留、数据库只读策略生效、延迟和内存可接受。

9. 团队场景（可选）
前提：有 secrets manager 或受保护的 passphrase 分发方式；只共享假名密钥，不共享 vault key。
```sh
veil team export --to aws-sm://veil/team
veil team join --from aws-sm://veil/team
veil team managed-settings --port 8787
```
预期结果：团队成员能共享假名密钥；管理员可用 managed-settings 强制 Claude Code 走 veil。

## 怎么判断变好了
- 做法 A 正向指标：`/my-privacy-status` 显示 `Configuration: loaded` 且 `mappings` 计数 > 0；模型侧看到的是别名，工具实际执行/落盘的是原名；`/my-privacy-audit` 里只有结构元数据、看不到命令与正文。
- 做法 A 负向指标（视为未生效）：状态为 `unavailable` / `invalid`，或 `loaded; mappings: 0`；把未配置的真实敏感词丢进请求，模型输入里仍然原样出现（这正是它声明不覆盖的范围，用来确认边界而不是当成 bug）。
- 做法 B 正向指标：`veil status` 能显示项目状态；capture 目录中已知真实值命中为 0；`uv run veil audit` 报告 0 泄露；任务成功率不低于基线；最终 diff 中假名残留数为 0；数据库只读策略生效；停掉代理后请求失败关闭，不把原始数据直发出去。
- 做法 B 成本侧：记录请求延迟、缓存命中率和本地内存占用，确认团队可接受；记录误报替换次数和人工复核次数。
- 最小试用：A 先不要写真实姓名/公司，直接用示例虚构映射跑通“配置→加载→模型侧回显→工具侧落盘”，再加一次 `/my-privacy-status` 和 `/my-privacy-audit`。B 选一个含少量真实或仿真 PII 的测试仓库，用独立 vault 和端口，按第 8 步跑一个边界清楚的任务，至少完成一次 capture 搜索 + audit + 与基线任务对比。
- 试多久：原文未给出固定时长；以一条完整链路作为最小验证单位，A 是一条“配置→加载→模型侧回显→工具侧落盘”，B 是一个“初始化→代理运行→任务执行→capture/audit→对比基线”的闭环。任一真实值泄露即停止试用并回到评估。

## 常见坑
- 改完 A 的配置忘记 `/reload-plugins`：插件每次加载只读一次配置，不重载就还是旧的。
- 把 `loaded; mappings: 0` 当成已保护：这表示词条列表为空，等于没保护。
- 把 A 当通用 PII 检测器：它只处理配置过的词条，未配置的信息和未支持的内容可能保持不变。
- 用 `install.py` 做 A 的日常安装：它会额外改动插件顺序、禁用指定的 compaction 插件、写入遥测相关设置。
- 把真实信息写进仓库：A 的真实信息只能写在仓库之外；B 的 `veil init` 会写 git-ignored 的 `.claude/settings.local.json`，不要提交。
- 换平台或换版本不重新验证 A：仅在 macOS + Claude Code 2.1.290 验证过，见 `verification/README.md`。
- 忽略 A 的许可证状态：项目尚无开源许可证，插件清单标注 `UNLICENSED`，长期使用与二次分发的合规性不明。
- 把 B 当完整 DLP：它不扫描图片截图、不保证未知语言代码转义、不处理跨多行稀有准标识符组合；短于 8 字符的值只做逐字或编码匹配；常见单词形式的独立姓氏不单独种子化；第三方自由文本需要额外 NER；片段搜索不能命中真实数据。
- 把 B 当生产多租户隔离：项目 alpha，云厂商路径未对真实云账户验证；本机可信，vault、智能体本地转录和本地遥测仍持有真实数据。
- 停掉代理后期望照常工作：验证时应确认请求失败关闭，不应把原始数据直发出去。
- 给 B 接入不必要的数据源：只提供只读连接串或必要 fixture，不要把不必要的数据源都接进来。
- 用 B 的数据库工具做写入：它定位为只读查询；写入、`$out`、`$merge`、多语句和伪名片段搜索应被拒绝或解释。
- 把 A 和 B 混为一谈：A 是词条级别名插件，B 是代理级假名化；覆盖范围、运行方式、许可证与成熟度不同。

## 证据与来源
- 做法 A：来自 `jinrunsen/claude-my-privacy` 调研。事实：插件版本 0.5.0；仓库 35 stars（来自抓取指标）；在 macOS + Claude Code 2.1.290 上，离线工具与终端显示检查已通过；示例配置含 4 组虚构映射，可据此复现行为；明确的命令与状态返回值（`loaded; mappings: 0` / `unavailable` / `invalid`）；项目尚无开源许可证，插件清单标注 `UNLICENSED`。作者主张/原文弱化：替换是 best-effort，不做保证；没有命令或邮箱白名单；替换失败时不锁定会话；对助手回复显示的还原用的是 “attempts to restore”，且不改动已存储的会话文本或模型上下文；只保护配置过的词条，不调用模型、不做网络检测。
- 做法 B：来自 `lemonadesaltbagel/veil` 调研。事实：本地代理位于 `127.0.0.1:8787`；支持 Claude Code、Codex CLI、Aider、Continue、OpenAI SDK、LiteLLM、DeepSeek Harness；PyPI 包名 `veil-proxy`；Apache-2.0；项目状态 alpha；README 给出安装、初始化、MCP 数据库、capture/audit 等命令。README 自报数据：在 1,000 条 ai4privacy 自由文本上，纯正则匹配漏过 80.4%，正则加专用 PII NER 漏过 17.6%，从自有数据种子化的 veil 漏过 1.8%；四组真实智能体会话共 39 个模型请求、463 个真实值，0 泄露，后续又加 32 个请求仍为 0；21 种单命令绕过变换 21/21 被拦截或完全脱敏；35 个 shell/SQL 注入测试中 23 个在无保护时失败、35 个在有保护时通过；68,000 个随机嵌套命令模糊测试中 0 次执行代码；真实仓库 pilot 种子化 39,650 个值，任务成功、0 泄露、代码中 0 假名；74–89% 的缓存命中、约 8 ms 脱敏加 11 ms guard、1.2M 种子值时 37+68 ms 和 1.1 GB 内存。以上主要是作者自建 harness 的自报结果，不是独立第三方评测；仓库仅 32 stars；明确局限包括本机可信、智能体可能发明未预见的变换、短于 8 字符的值只做逐字或编码匹配、常见单词形式的独立姓氏不单独种子化、第三方自由文本需额外 NER、跨多行稀有准标识符组合不处理、未知语言代码转义不保证、图片不扫描、Bedrock/Vertex/Microsoft Foundry/Claude Platform on AWS 只用真实 CLI 对 fake upstream 验证、尚未对真实云账户验证、片段搜索无法命中真实数据。
- 与已有做法的关系：两者都是叠加在编码智能体模型输入与工具执行链路上的本地隐私层，不替代 Claude Code、Codex CLI 等宿主；A 是 Claude Code 插件式词条替换，B 是代理式假名化。清单中 Claude Code 已 adopt；A 属于在已采用的宿主上补“条件供给／隐私边界”的一层。

## 依据的调研

- [jinrunsen/claude-my-privacy](../research/radar/2026-10-07/1687-jinrunsen-claude-my-privacy.md)：值得一试，值得在 Claude Code 上小范围试用：它给出了可直接照抄的配置目录、安装、状态校验和更新命令，能在把私有名称/公司信息交给模型前替换为别名、本地执行前还原，从而降低上下文泄露面；但替换是 best-effort、无白名单、失败不锁会话，且仅在 macOS + Claude Code 2.1.290 验证过、无开源许可证，所以先按虚构示例跑通再换真实信息。
- [lemonadesaltbagel/veil](../research/radar/2026-10-27/7494-lemonadesaltbagel-veil.md)：值得一试，建议在受控的测试仓库中小范围试用：用 veil 代理 Claude Code/Codex 等编码智能体，把本地数据库、fixture、git 和代码 schema 中的真实值先做确定性假名化，再用 capture/audit 验证外发请求零泄露。理由是 README 给出了可复制的安装、初始化、MCP 数据库工具和审计命令，但项目仍是 alpha，且云厂商路径未对真实云账户验证，不适合直接全量采用。
