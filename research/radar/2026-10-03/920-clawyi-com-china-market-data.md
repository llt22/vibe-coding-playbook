# clawyi-com/china-market-data

- 结论：**值得一试**。建议小范围试用：在 Claude Code 或 Cursor 等可执行本地 Python 的宿主中安装该 Skill，用于中国金融数据检索类任务；理由是它提供了可照做的安装、调用和验证步骤，但属于特定领域且存在数据授权与接口稳定性限制。
- 原文：https://github.com/clawyi-com/china-market-data
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T23:37:56.206Z

## 是什么

`clawyi-com/china-market-data` 是一个面向中国市场的金融数据 Skill，让 Cursor、Claude Code、Codex 等 AI Agent 通过可运行的 Python CLI 获取 A 股行情、研报、资金、公告、打板、期权、期货、宏观等真实数据。它提供 15 层能力、87 个端点、34 个数据来源，除 iwencai 外全部免 API Key。数据直接取回本机并写入 JSON，不经过第三方中转服务。原文声明它不是投顾建议，也不是付费数据商 SDK。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：Node.js 22.20+ / npm。安装 Skill（交互式全局安装，自动识别已安装的 Agent）：

```bash
npx --yes skills@latest add clawyi-com/china-market-data -g
```

指定宿主并跳过确认：

```bash
npx --yes skills@latest add clawyi-com/china-market-data -g -y --agent cursor
```

只查看仓库中可安装的技能：

```bash
npx --yes skills@latest add clawyi-com/china-market-data --list
```

2. 前提：Python 3.9+。安装 Python 依赖。初始化脚本会在技能目录内创建 `.venv`、安装依赖并执行离线检查；全局安装的副本默认位于 `~/.agents/skills/china-market-data`。

macOS / Linux：

```bash
SKILL_DIR="$HOME/.agents/skills/china-market-data"
python3 "$SKILL_DIR/tools/setup_env.py"
```

Windows PowerShell：

```powershell
$SkillDir = "$env:USERPROFILE\.agents\skills\china-market-data"
py -3 "$SkillDir\tools\setup_env.py"
```

注意：`npx skills update` 或重新安装会整体替换技能目录，目录内的 `.venv` 也会被删除；更新后需再运行一次 `setup_env.py`。

3. 可选：把虚拟环境放在技能目录外，避免更新技能时重建。之后一律用该解释器运行脚本：

```bash
python3 <技能目录>/tools/setup_env.py --venv ~/.venvs/china-market-data
~/.venvs/china-market-data/bin/python <技能目录>/scripts/run.py --check
```

Windows 对应为 `py -3 <技能目录>\tools\setup_env.py --venv $env:USERPROFILE\.venvs\china-market-data`，解释器位于其中的 `Scripts\python.exe`。结果文件写到当前目录，请在可写目录下运行，或用 `--output` 指定路径。

4. 装好后直接向 AI 助手提问。原文给出的示例问法包括：

- “贵州茅台现在的价格、PE、PB、市值和换手率”
- “拉宁德时代近一年前复权日 K 线”
- “今天涨停池、连板梯队和炸板率怎么样”
- “今天有哪些强势股，分别是什么题材”
- “北向资金今天的分钟流向”“概念板块近 5 日主力资金流入排名”
- “今天全市场龙虎榜净买入排名，以及某只股票的买卖席位”
- “比亚迪最近的券商研报和机构一致预期 EPS”
- “查某公司最新公告 PDF”“公司在互动易上怎么回应这个传闻”
- “300ETF 期权 T 型报价、隐含波动率和希腊字母”
- “螺纹钢主力连续日 K”“上期所持仓前 20 名”
- “最新 LPR、FR007 和中债国债收益率曲线”
- “本周新股申购”“可转债转股溢价率”
- “把这些代码转成聚宽格式，并拉申万行业历史归属”

只讨论概念或投资观点、不需要实际取数时，技能不会被加载。

5. 也可直接运行 CLI（在技能根目录运行；输出文件需使用新文件名）：

```bash
# 实时行情：裸 000001 是平安银行；上证指数用 sh000001
python3 scripts/tencent_quote.py sh000001 sz000001 510300 --output quotes.json

# 当日强势股与来源给出的题材标签
python3 scripts/run.py ths_hot_reason.py --output hot.json

# 概念板块最近 5 日涨幅；与主力资金流排名不同
python3 scripts/run.py eastmoney_signals.py board-quotes --board-type concept --period 5d --top-n 20 --output boards.json

# 查看某个命令的参数
python3 scripts/run.py eastmoney_signals.py board-quotes --help
```

默认板块接口失败后，可显式尝试 `--source dataapi`。它仍属于东财，不是独立供应商，也不保证能绕开同源故障。大部分 CLI 将完整返回结构写入 JSON，终端只给预览；需要读取实际文件，不能把预览条数当成全部数据。

6. iwencai 入口需要用户自己的 `IWENCAI_API_KEY`，配置方法见 SKILL.md#prerequisites。不要把 Key、Cookie 或会话文件提交到仓库。

7. 开发者安装（需要修改代码或保留完整 Git 历史时）：

```bash
git clone https://github.com/clawyi-com/china-market-data.git
cd china-market-data
python3 tools/setup_env.py
```

手动复制或解压时，目标目录必须命名为 `china-market-data`，并保留 `SKILL.md`、`scripts/`、`references/`、`requirements.txt`、`LICENSE`、`NOTICE` 和 `UPSTREAM.md`；不能只复制一个 Markdown 文件。

8. 开发验证（离线，不请求实时行情）：

```bash
python3 -m compileall -q scripts tools tests
python3 -m unittest discover -s tests -v
python3 tools/build_release.py
npx --yes skills@latest add . --list
```

这些检查不请求实时行情；离线测试通过不证明上游数据源此刻可用。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. 能力发现：AI 可通过该 Skill 自主获取中国股票市场 15 层数据，包括实时行情、K 线、研报、资金流、龙虎榜、公告、打板情绪、期权希腊字母、期货、宏观利率、可转债等。原本需要人工在多个网站查询的工作，可交给 AI 按 SKILL.md 路由表按需调用。

2. 任务匹配：适合需要中国金融数据检索与初步整理的任务。适合能执行本地 Python 的 Agent 宿主（Cursor、Claude Code、Codex 等）。工具形态为 Skill + CLI + JSON 输出。不适合只能聊天、不能执行脚本的环境；也不适合直接驱动交易（原文声明不提供交易执行）。

3. 条件供给：需要 Node.js 22.20+/npm 安装 Skill，Python 3.9+ 运行 CLI，网络访问数据源，可写目录输出 JSON。iwencai 需要用户自备 `IWENCAI_API_KEY`。需向 AI 提供清晰的数据需求（如标的、时间范围、指标），并理解数据边界（抓取时间不是行情时间、缺失值保留在 `missing` 等）。反馈机制：失败时明确报错，不用空数据冒充成功。

4. 主动推进：原文未描述由时间、事件或状态触发并持续完成的机制；仅提供按需调用的 CLI 和 Skill 路由。因此这一点暂无直接依据。

5. 效果验证：可通过检查输出 JSON 是否包含报价来源、行情时间和抓取时间，区分缺失值与真实 0，以及失败时是否明确报错来判断数据获取质量。开发验证提供离线编译、单元测试和构建检查命令。原文未给出与人工查询对比的量化指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有 Claude Code（tool，adopt）、Cursor（tool，watch）、skills.sh（source，try）。本项目通过 skills.sh 分发，安装后可在 Claude Code、Cursor 等宿主中使用；因此它可作为 Claude Code 和 Cursor 在金融数据检索场景的扩展技能，并依赖 skills.sh 作为安装来源。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据：原文给出可复制的安装命令（`npx skills add`、`setup_env.py`）、CLI 示例命令、15 层能力表、34 个数据来源列表、开发验证命令，以及数据边界说明（时间戳、降级、缺失值处理、明文 HTTP 风险等）。案例：“直接这样问 AI”表格列出了一批可用的自然语言问法。数据：15 层、87 个端点、34 个来源、除 iwencai 外免 API Key。

作者主张：这不是投顾建议，也不是付费数据商 SDK；代码开源不代表数据开放授权；免费或免 Key 不等于可自由商用；本项目没有逐项取得再分发授权。

局限：Windows 命令未经过完整平台实测；部分接口仍使用明文 HTTP，存在传输风险；东财节流主要在单进程内生效，多 agent 并发不会自动获得跨进程全局限流；接口可能限流、认证变化、缺失、延迟或下线；部分历史数据只有本地已保存记录，不能承诺补齐；更新后需重新初始化 `.venv`；只讨论概念或投资观点、不需要实际取数时技能不会被加载。适用条件：需要能执行本地 Python 的 Agent 宿主，具备 Node.js 和 Python 环境，且使用数据时遵守各供应商条款。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用：在一个支持本地 Python 执行的 Agent（如 Claude Code 或 Cursor）中按“具体做法”第 1–2 步安装并初始化，然后直接问 AI：“贵州茅台现在的价格、PE、PB、市值和换手率”，检查返回结果是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。也可在技能根目录直接运行原文示例命令：

```bash
python3 scripts/tencent_quote.py sh000001 sz000001 510300 --output quotes.json
```

然后查看 `quotes.json` 是否包含上述字段。

验证指标：1) 数据获取成功率（能成功返回 JSON 而非报错）；2) 输出是否携带报价来源、行情时间和抓取时间；3) 失败时是否明确报错而非返回空数据；4) 更新技能后按提示重新初始化能否恢复正常；5) 对同一标的，与官方来源（如交易所或腾讯财经页面）抽样比对关键字段是否一致（原文未提供自动比对工具，需人工核对）。若以上指标改善，说明该 Skill 在金融数据检索任务中有效。
