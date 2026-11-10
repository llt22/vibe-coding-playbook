# DevCrabs-Inc/yandex-metrika-mcp

- 结论：**值得一试**。如果你的工作涉及 Yandex Metrika（俄罗斯站点分析），按 README 的一条命令或 JSON 配置安装这个只读 MCP 服务器，让 Claude/Cursor/Codex 直接取数，并且每次回答都带日期、时区、采样状态和过滤器；它的价值不在于“又一个连接器”，而在于示范了“把取数口径（日期边界、时区、采样、聚合规则、API 总计）当作工具输出的一部分强制返回”，这套做法可以迁移到任何数据源。若你不用 Yandex Metrika，只需读它的输出可核验设计，不必安装。
- 原文：https://github.com/DevCrabs-Inc/yandex-metrika-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T15:28:13.281Z

## 是什么

`@dev-crabs/yandex-metrika-mcp` 是一个**只读**的 MCP（Model Context Protocol）服务器，把 Yandex Metrika 的流量/来源/落地页/目标数据接给 Claude Desktop、Claude Code、Cursor、VS Code、Windsurf、Codex 等任意 MCP 客户端。

作者自述的四个设计点（README 原文）：

- 浏览器登录，不粘贴 token，token 不进聊天记录；
- 数字可核验：按计数器时区的日历周期、默认只取完整日、“严格精度”模式宁可拒绝采样数据也不冒充精确、用 API 总计而非可见行求和；
- 多账号/多客户隔离连接；
- 全量导出：后台 CSV/JSON 任务，带校验和、manifest、可断点续跑。

规模很小：13 个工具、3 个提示词，只读，没有写接口、没有裸 HTTP 工具。版本 1.0.0（首个稳定版），MIT。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Node.js 22.13 及以上；一个 MCP 客户端；要查真实数据时需要一个有对应计数器权限的 Yandex 账号（README 说明无需自建 API key、无需自建 OAuth 应用）。

1. **安装（一条命令写入客户端配置并自动备份）**。`--client` 可选 `claude-desktop`、`claude-code`、`cursor`、`vscode`、`windsurf`、`codex`：

```bash
npx -y @dev-crabs/yandex-metrika-mcp setup --client claude-desktop   # or claude-code, cursor, vscode, windsurf, codex
```

2. **Claude Code 单独装法**（不走 setup）：

```bash
claude mcp add --scope user yandex-metrika -- npx -y @dev-crabs/yandex-metrika-mcp
```

3. **任意 MCP 客户端**用标准 `mcpServers` 格式；VS Code 用 `servers` 且要加 `"type": "stdio"`：

```json
{
  "mcpServers": {
    "yandex-metrika": { "command": "npx", "args": ["-y", "@dev-crabs/yandex-metrika-mcp"] }
  }
}
```

4. **Windows 专用改法**（README 说部分客户端无法直接启动 `npx`，`setup` 在 Windows 上写的就是这个）：

```json
"command": "cmd", "args": ["/c", "npx", "-y", "@dev-crabs/yandex-metrika-mcp"]
```

5. **重启客户端，然后第一句话用这句**（触发 `metrika_connect`，助手会返回一个本地登录链接，在浏览器里完成登录）：

```text
Connect Yandex Metrika and compare the last two weeks by traffic source.
```

6. **先不接账号试跑**：README 说合成连接 `conn_demo` 始终可用，可用来验证工具链是否通、输出长什么样。

7. **摸清数据边界再提问**：先让助手调 `metrika_list_counters` / `metrika_describe_counter`，拿到站点、**时区**、以及**目标（goal）及其 ID**；这是后面所有提问里“哪个 goal 算转化”的前提。

8. **让模型先读口径再算数**：调 `metrika_catalog` 拿预设、指标（含**聚合规则**）、维度、周期预设。这一步是把“口径”作为输入喂给模型，而不是让它自由发挥。

9. **取数三件套**：
   - `metrika_run_report`：单周期，预设或显式字段、过滤器、排序、分页；
   - `metrika_compare_periods`：两个周期在**完全相同条件**下对比，给绝对值、百分比、百分点（p.p.）变化；
   - `metrika_run_timeseries`：按日/周/月分桶，按精确日历边界切。

10. **大批量导出走近路**：`metrika_export_report` 起后台任务 → `metrika_get_job` 轮询 → `metrika_read_artifact` 取产物（带校验和与 manifest，重启后可续跑）；要停就 `metrika_cancel_job`。

11. **用内置提示词固化复查节奏**：`weekly_review`（周复查）、`traffic_drop`（流量下跌排查）、`landing_conversion`（落地页转化）。README 只给了提示词名，未给内容。

12. **可直接复用的提问模板**（原文示例，照抄可用）：

```text
Compare the last two complete weeks by visits and target visits of goal 3001.
Which landing pages brought the most leads for goal X last month?
Show weekly visits since the start of the quarter.
Export all traffic sources for October to CSV for Excel.
```

13. **安全默认值确认**：token 存在操作系统凭据库（macOS Keychain / Windows Credential Manager / Linux Secret Service）；没有凭据库时服务器**默认拒绝保存**，除非你显式选择“仅本人可读的未加密文件”；标签中的 URL 查询串默认被剥离；无遥测。团队共享场景用多连接隔离，别共用一条连接。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 给出四类“可以交给 AI 的分析动作”：两周期同条件对比（含 p.p. 变化）、按目标 ID 找带来线索的落地页、按自然周/季度起点做时间序列、按条件全量导出到 CSV 给 Excel。价值在于这些是“问一句就能拿到带口径的结果”，而不是让人去后台点报表。
- **任务匹配**：给了具体的工具形态选择依据——**小而易预测的接口面**（13 工具、3 提示词）、**只读、无裸 HTTP 工具**。这直接对应“什么工作适合怎样的工具”：报表问答适合“窄接口 + 强约束”的 MCP，而不是给模型一个万能 HTTP 工具让它自由拼 API。
- **条件供给**：这是全文最强的部分。（a）**权限**：浏览器登录、token 存 OS 凭据库、不进对话；多账号连接彼此隔离。（b）**信息**：`metrika_describe_counter` 提供时区与 goal ID，`metrika_catalog` 提供指标聚合规则、维度、周期预设——把“怎么算”显式喂给模型。（c）**反馈**：每次回答附带日期、计数器时区、采样状态、过滤器、provenance，让用户能反向核对。
- **主动推进**：部分有依据——导出是**后台任务**（起任务 → 轮询 → 取产物，重启后可续跑），属于状态驱动的异步执行；`weekly_review` 等提示词暗示了周期性复查的场景，但 README **没有**说明调度/触发器机制，不能当作已实现的“定时自动跑”。
- **效果验证**：直接对应——默认只取**完整日**、按计数器时区切**日历周期**、严格精度模式**拒绝采样数据**而不是标成精确、用 **API 总计**而非可见行求和、导出带**校验和与 manifest**。这是一套“输出自带可核验证据”的模板。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：本服务器明确支持，README 给了专门命令 `claude mcp add --scope user yandex-metrika -- npx -y @dev-crabs/yandex-metrika-mcp`，也支持 `setup --client claude-code`。它是 Claude Code 生态里“接一个只读数据源”的具体样例。
- **Cursor（watch）**：明确支持，有 `setup --client cursor` 与一键安装 deeplink。清单里 Cursor 尚为 watch，这里可以作为它 MCP 接入能力的一个实测点。
- 其余条目清单中没有相关条目。补充：README 自称的差异化主要针对“通用 BI 对话式查询”，原文未点名具体竞品，不做推断。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的（可核对的声明）**：
- 版本 1.0.0，工具名/参数/输出遵循语义化版本；
- 测试覆盖：对**合成数据与模拟 API** 做测试，并在 macOS 上用**真实 Yandex 登录**跑过报表；其他客户端与平台列在 `docs/release-checklist.md`（该文件内容未提供）；
- 13 个工具、3 个提示词的具体名称与职责（表格完整列出）；
- 合成连接 `conn_demo` 始终可用；
- 凭据存储位置与“无凭据库时默认拒绝保存”的行为；
- 标签中 URL 查询串默认剥离；无遥测。

**只是作者主张 / 未给证据的**：
- “numbers you can verify”“strict accuracy refuses sampled data”的**实际效果**没有任何对比数据或案例；
- 准确性只有设计描述，没有给出与 Yandex 后台人工核对的样例差异；
- 没有性能数据（大报表耗时、导出规模上限）、没有错误率。

**局限与适用条件**：
1. **只对 Yandex Metrika 用户有用**，是垂直单一数据源，不是通用能力；不用 Yandex Metrika 的团队只能借鉴模式。
2. README 承认**只在 macOS 上做过真实登录与报表验证**，Windows/Linux 及其他客户端的情况未在本文档中给出结论。
3. 文档主体在俄语（`README.ru.md`、`docs/ru/*`），本次材料只有英文 README，细节（如 `weekly_review` 提示词内容、导出上限、采样拒绝的具体触发条件）无法核实。
4. 126 stars、1.0.0 首发版本，属早期项目；README 未提社区规模或长期维护承诺。
5. 数据会发送给你的 AI 客户端及其模型提供方（原文明确），token 不会——在合规敏感环境要按此评估。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约 15 分钟，零风险）**
1. 用第 1 或第 2 步的命令装好，重启客户端。
2. 不接账号，先用 `conn_demo` 问一句："Compare the last two complete weeks by traffic source."，确认工具被正确调用、输出里**确实带了日期区间、时区、采样状态、过滤器**这几项。这是判断“可核验”是否落到实处的第一条硬标准。
3. 接真实计数器：跑 `metrika_list_counters` 和 `metrika_describe_counter`，记下时区与一个 goal ID。
4. 挑一个你每周本来就要手做的报表，用 `metrika_compare_periods` 复现它（同周期、同过滤器、同 goal）。
5. 同一问题换成一个长周期，走 `metrika_export_report` → `metrika_get_job` → `metrika_read_artifact`，拿到 CSV。

**判断有没有改善的指标（都可直接量化）**
- **口径零歧义率**：抽查 5 次回答，看是否 5/5 都写明日期区间、时区、采样状态、过滤器。缺一项就算不通过。
- **数字对得上**：把同一周期、同一过滤器的结果与 Yandex Metrika 网页后台手查值比对；重点看是否出现“可见行求和 vs API 总计”的差异（有差异说明工具的口径更对，值得采用）。
- **采样是否被识别**：故意选一个数据量大、会触发采样的区间，确认它**拒绝**而不是给出一个看起来精确的数。
- **返工次数**：同一问题从提问到拿到可用结论需要的追问/纠错轮次，与人工做对比。
- **耗时**：从提问到拿到可贴进周报的对比表，计时对比手工操作。
- **导出完整性**：核对导出 CSV 行数与 manifest/校验和是否自洽，以及中断后能否续跑。

**不达标就退回 study**：若上述任一项（尤其是采样识别与日期/时区标注）在实际使用中缺失，说明“可核验”只是宣传，改为只借鉴设计思路、不纳入手册的默认做法。
