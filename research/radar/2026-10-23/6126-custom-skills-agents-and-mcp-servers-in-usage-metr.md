# Custom skills, agents, and MCP servers in usage metrics API

- 结论：**值得研读**。建议把这条作为 Copilot 自定义能力采用度与效果验证的观测手段来研读：在已启用 Copilot usage metrics 的企业或组织中，用 totals_by_* 的命名条目跟踪自定义技能、Agent、MCP 等的采用趋势；但原文只是 changelog，未给出 API 调用步骤，且客户端遥测会低估，不能作精确核算。
- 原文：https://github.blog/changelog/2026-10-22-custom-skills-agents-and-mcp-servers-in-usage-metrics-api
- 来源：rss:src-github-changelog，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-22T23:49:43.197Z

## 是什么
GitHub Copilot usage metrics API 更新：企业级和组织级报告中，原本被归入 other 或 custom 的自定义技能、自定义 Agent、MCP 服务器、slash command、plugin，现在可以按配置名称显示。每个 totals_by_* 列表最多显示 25 项（此前为 5 项），剩余活动合并到末尾 other 条目。interaction_count 和 distinct_*_use_count 的计算方式不变。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 前提：确认企业或组织已启用 Copilot usage metrics policy；账号需为企业所有者、计费管理者、组织所有者，或拥有授予 View Copilot Metrics 权限的自定义组织/企业角色。原文未给出 API endpoint 或调用命令，实际调用需按 Copilot usage metrics API 文档执行。
2. 选择报告范围：使用企业级或组织级报告，包括 per-user 1-day 和 28-day 报告、aggregated 1-day 报告，以及 aggregated 28-day 报告中的 day_totals。
3. 读取命名统计字段：在报告中查看以下数组，按配置名称识别自定义项，而不是只看 other/custom：
```text
totals_by_skill
totals_by_custom_agent
totals_by_mcp
totals_by_slash_cmd
totals_by_plugin
```
每个 totals_by_* 列表每条记录最多 25 项；超出部分合并到末尾 other 条目。
4. 核对客户端覆盖与版本前提：名称可从 Copilot CLI（交互会话和 prompt mode）、GitHub Copilot app、ACP 集成（如 JetBrains）和 Copilot SDK 上报。prompt mode、app、ACP 集成需要 Copilot CLI 1.0.97 或更高；Copilot SDK 需要 v1.0.21 或更高；IDE 的 agent experiences 运行在 Copilot SDK v1.0.21 或更高时才上报名称；IDE 内置 chat telemetry 不上报名称。客户端版本不达标时，报告会低估或仍显示 other/custom。
5. 解释名称：名称按配置原样上报，会 trim 并限制在 128 字符以内；看起来像文件路径的名称仍会归入 other 或 custom。将报告分享到组织外之前应先审查名称。
6. 使用新处理日期做前后对比：名称从本次发布后处理的报告日开始出现；更早日期仍显示 other/custom。评估新自定义项推广效果时，要用发布后处理的新报告日，避免把历史日期混入对比。
7. 解读口径：这些指标用于理解趋势和采用情况，不作精确核算；interaction_count 和 distinct_*_use_count 的计算方式与之前相同。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- 能力发现：原文没有说明 AI 新能完成哪些工作，只涉及对已配置自定义项的计量。无直接依据。
- 任务匹配：原文没有讲不同任务适合什么模型、工具或协作方式，仅列出覆盖客户端和版本要求。无直接依据。
- 条件供给：有间接依据。要获得命名统计，需要启用 Copilot usage metrics policy、具备相应查看权限、客户端版本达标，并配置可读名称；路径式名称会被归入 other/custom，说明命名和客户端条件会影响反馈质量。
- 主动推进：无直接依据。该能力是事后用量统计，不是由时间、事件或状态触发并持续执行工作的机制。
- 效果验证：有直接依据。管理员可按名称查看内部 skills、custom agents、MCP servers 的实际使用，跟踪新项推广后的采用，并把 enablement 聚焦到需要的地方；但指标来自客户端遥测，会低估活动，适合看趋势和采用而非精确核算。

## 与已有做法的关系
清单中有 GitHub Copilot（tool，状态 drop）。本条是 Copilot 管理侧的 usage metrics API 能力，不是基础工具本身，也不构成新的工作方法；它不改变清单中该条 drop 的结论，但可作为 Copilot 相关自定义能力采用度与效果验证的观测补充。若手册写到 Copilot 自定义项的推广验证，可引用这条的指标口径和限制。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
原文给出的具体信息：totals_by_skill、totals_by_custom_agent、totals_by_mcp、totals_by_slash_cmd、totals_by_plugin 五个数组按名称显示；每列表最多 25 项，此前为 5 项，剩余合并为 other；interaction_count 和 distinct_*_use_count 计算不变；覆盖 CLI、app、ACP、SDK，并给出 CLI 1.0.97、SDK v1.0.21 的版本门槛；名称 trim 且限 128 字符，路径式名称仍归入 other/custom；名称从发布后处理的报告日开始出现；访问需要企业/组织权限和 metrics policy。原文没有给出 API endpoint、请求示例或完整配置步骤，也没有案例数据。
作者主张：管理员可以看到团队实际使用哪些内部 skills、custom agents、MCP servers，跟踪新项推广后的采用，并聚焦 enablement。这些是用途主张，不是效果数据。
局限与适用条件：指标来自客户端遥测，客户端过旧或遥测被阻断时会低估；不能用于精确核算；IDE 内置 chat telemetry 不上报名称；历史日期仍显示 other/custom；名称长度和路径式名称会影响可读性；需要企业/组织已启用策略并具备权限。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用：选一个已启用 Copilot usage metrics policy 且有查看权限的企业或组织；推广或上线一个命名清晰的自定义 skill、custom agent 或 MCP server，记录其配置名称；确认相关客户端达到 CLI 1.0.97、SDK v1.0.21 等版本门槛；在发布后处理的新报告日，拉取 1-day 和 28-day 的企业/组织报告，检查对应 totals_by_* 中是否出现该名称，并读取 interaction_count 和 distinct_*_use_count；用已知推广范围和客户端版本名单交叉核对。原文未给 endpoint，实际拉取需按 Copilot usage metrics API 文档执行。
判断指标：命名条目是否出现、使用次数和去重使用人数是否随推广上升、趋势是否与推广时间吻合、末尾 other 条目占比是否下降、报告是否因客户端过旧或遥测阻断而明显低估。若命名条目大量落入 other/custom 或与已知推广范围不符，应先修客户端版本、遥测或命名，再判断采用效果。
