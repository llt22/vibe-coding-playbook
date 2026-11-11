# homeassistant-ai/ha-mcp

- 结论：**值得一试**。有 Home Assistant 的团队可以照着 README 的步骤小范围试：先跑 demo 打通连接，再用只读模式接真实实例，然后逐工具放开写权限；理由是它是少见的、把“给 AI 开放一整套工具与管理员权限”所需的前置条件（专用账号、只读开关、逐工具开关、审批策略、改动前自动备份、领域技能包、按模型能力选择工具加载方式）都写成了可照做的配置，但它只覆盖智能家居运维这一个场景，原文也没有任何效果量化数据。
- 原文：https://github.com/homeassistant-ai/ha-mcp
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T06:28:27.238Z

## 是什么

ha-mcp 是一个独立 MCP 服务器（基于 FastMCP，约 87 个工具），把 Home Assistant 的配置接口整体开放给 Claude、ChatGPT、Gemini CLI、Cursor、VS Code 等 MCP 客户端。它与 Home Assistant 自带的 MCP Server 定位不同：自带版建在 Assist 管线上，只能读写“已暴露给 Assist 的实体”并执行 Assist 能理解的意图，适合语音式控制；ha-mcp 面向“搭建、维护与排障”，除设备控制外还能创建/修改自动化、脚本、场景、仪表盘，管理 helper、区域、楼层、分组、标签、日历、蓝图，读历史/统计/日志/自动化执行 trace，管备份、应用、HACS、设备与实体注册表，以及在开启 beta 后编辑 YAML 和文件。

README 给的典型用法就是自然语言下达配置任务（“在日落时开 porch light 的自动化”、“给仪表盘加天气卡片”、“这个 motion sensor 自动化不工作，调试它”），由 agent 直接改配置。

## 具体做法

**第 0 步：先明确前提**
- 需要 Home Assistant 实例；推荐的“一体化（in-process）服务器”方式要求 Home Assistant 2026.8.0 或更新（README 以 9.0.0 / 2026-10-28 及之后的设置界面为准，更早版本设置表单更短）。
- 一个 MCP 客户端（Claude Desktop / claude.ai / Claude Code / ChatGPT / Gemini CLI / Cursor / VSCode 等，README 称支持 15+ 客户端）。
- 关键纪律：**每个客户端只配一种安装方式**。自定义组件、app(add-on)、Docker/PyPI、本地 stdio 是同一个服务器的四种跑法，同一客户端里挂两条（例如既有一条本地 `uvx ha-mcp@latest` 又有一个组件 URL）是已知的连接挂起原因。
- 不要用 stdio 做正式环境：README 标注 stdio 有已知传输问题（#1713），只建议 demo/试验；正式用组件或 HTTP。

**第 1 步：零成本先试通（不动自己的实例）**

macOS：
```sh
curl -LsSf https://raw.githubusercontent.com/homeassistant-ai/ha-mcp/master/scripts/install-macos.sh | sh
```

Linux（社区版 Claude Desktop 或 Claude Code）：
```sh
curl -LsSf https://raw.githubusercontent.com/homeassistant-ai/ha-mcp/master/scripts/install-linux.sh | sh
```
```sh
curl -LsSf https://raw.githubusercontent.com/homeassistant-ai/ha-mcp/master/scripts/install.sh | sh -s -- --claude-code
```

Windows PowerShell：
```powershell
irm https://raw.githubusercontent.com/homeassistant-ai/ha-mcp/master/scripts/install-windows.ps1 | iex
```

这些脚本连的是官方托管的 **demo 环境**（stdio），装完重启客户端，然后问一句固定验收语：**"Can you see my Home Assistant?"**。这一句就是最小可用性的判断标准。

**第 2 步：正式安装（推荐：组件一体化方式）**
1. 装 **HA-MCP 集成**：HA 2026.8–2026.10 走 HACS 搜 **HA-MCP** → Download；2026.11+ 走 **设置 → Marketplace**（接受首次运行警告）搜 **HA-MCP** → Install。该仓库在默认目录里，不需要连 GitHub 或加自定义仓库。已从旧仓库 `homeassistant-ai/ha-mcp-integration` 装过的继续收同一批发版。
2. **重启 Home Assistant。**
3. 决定服务器以哪个管理员身份行事（二选一）：
   - 在自己账号上建长期访问令牌：个人资料 → 安全 → 长期访问令牌 → 创建令牌（README 提醒：令牌泄漏后在任何地方可用，且改动会记在你名下）；
   - 更安全的做法：**设置 → 人员 → 添加人员**，为 HA-MCP 单独建账号，勾选 **允许登录**、**仅本地访问**、**管理员**。不要用自己账号做第二种方案。
4. **设置 → 设备与服务 → 添加集成**，搜 **HA-MCP**，选 **HA-MCP Server**；粘贴令牌，或填第 3 步专用账号的用户名密码（由 HA-MCP 自己生成令牌）；选择客户端连接方式——**通过 Home Assistant 远程访问**（先用 **Secret URL**，最简单；**Home Assistant 登录** 会多一层登录）和/或 **网络访问：本地网络**——然后提交。两种方式默认都是关闭的，所以另一台设备上的客户端必须至少开一种。
5. 从条目的 **配置** 页复制连接 URL（设置 → 设备与服务 → “HA-MCP — Manage Home Assistant with AI” → HA-MCP Server → 配置）。会有通知确认服务器已启动并指向这里。
6. 把 URL 粘进 AI 客户端即可。

远程客户端的连接 URL 形如：
```
https://<your-ha-domain>/api/webhook/<webhook-id>
http://<ha-host>:8123/api/webhook/<webhook-id>
http://<ha-ip>:9584/private_<random>
```

替代安装法（按需，任选其一）：
- **app(add-on)**（仅 HA OS / Supervised）：加仓库 `https://github.com/homeassistant-ai/ha-mcp` → 装 “Home Assistant MCP Server” → Start → 在 **日志** 页找 MCP URL → 客户端填该 URL，**不需要令牌**。
- **Docker（HTTP）**：跑 `ghcr.io/homeassistant-ai/ha-mcp`，指向 HA URL + 长期令牌（推荐管理员令牌；非管理员令牌有功能限制），客户端连它的 secret URL。
- **PyPI/uvx（HTTP）**：`uvx ha-mcp@latest` 作为 streamable-HTTP 服务器同样用法。
- **手工安装（无 HACS/Marketplace）**：把仓库里的 `custom_components/ha_mcp_tools/` 拷进 HA 的 `config/custom_components/`，重启后按上面第 4 步添加集成。
- 具体客户端配置由官方 Setup Wizard 生成：https://homeassistant-ai.github.io/ha-mcp/setup/

**第 3 步：先设安全阀，再放开写权限**
- 打开 **Read Only Mode**，先只让 agent 读和诊断，确认它看得懂你的系统后再逐项放开。
- 用 **per-tool enable/disable** 按需开工具，不要一次全开。
- 用 **tool security policies（用户审批）** 让高风险操作必须人工确认。
- 依赖 **automatic edit backups**（自动编辑备份）；helper/集成选项的编辑与删除会记录稳定的 config-entry 标识与实体 ID/名称映射，且“拒绝在密钥脱敏降级状态下做快照”。
- 只把远程访问开到你确实需要的范围；不需要远程就留空（此时**完全不注册 webhook**，直连端口和侧边栏面板照常可用）。要更严可把 **Authentication mode** 设为 `ha_auth`，用 HA 账号登录替代 secret URL 当凭据；或用 OIDC（Authentik/Keycloak/Auth0 等）挡在远程访问前面（所有通过认证的用户共用服务器的 HA 凭据，需知晓这一点）。
- 文件/YAML 编辑是特权工具（`ha_config_set_yaml`、`ha_read_file`、`ha_write_file`、`ha_list_files`、`ha_delete_file`，均为 beta），需要装组件并额外添加 **HA-MCP File & YAML Tools** 条目，且必须先开 `ENABLE_BETA_FEATURES` 总开关，子开关才生效。默认不开，不必装就不用装。

**第 4 步：按模型能力调整工具暴露方式（小模型必做）**
- 支持延迟/按需加载工具的客户端（claude.ai、Claude Desktop、Claude Code）默认直接列全部 ~87 个工具即可，空闲上下文成本接近零。
- 不支持延迟加载的模型/客户端（Claude Haiku、Gemini、OpenAI 兼容的本地模型与小开源模型，以及会把所有工具 schema 内联的客户端如 GitHub Copilot CLI）：开搜索式发现，避免一次性塞满上下文压垮小模型：
```
ENABLE_TOOL_SEARCH=true
```
  开启后工具列表只保留四个入口加少量常驻 pinned 工具（`ha_search`、`ha_get_overview`、`ha_report_issue` 等），其余靠 `ha_search_tools`（基于 FastMCP 的 BM25 英文关键词检索）发现；被发现的工具仍可直接按名字调用。
- 同时把模型的上下文窗口调高：本地运行时默认值（如 Ollama 的 `num_ctx`）装不下“大工具集 + 对话”。
- 若模型“看不到工具”或“看不到我的 HA”，README 的首选排查就是上面两条。

**第 5 步：配领域技能包（决定产出质量的关键）**
- MCP 服务器只给工具，不给“怎么组织”的判断；README 明确指出没有领域知识时 agent 会过度依赖模板、选错 helper 类型、写出难维护的自动化。
- 技能来自 `homeassistant-ai/skills`，已内置并以 MCP resources 形式经 `skill://` URI 提供，支持 resources 的客户端可自动发现，无需手工安装；不支持 resources 的纯工具客户端，用 `ha_get_skill_guide` 工具读取（无参数读 `SKILL.md`，带 `file` 参数读它链接的参考文件）。该工具是**强制常驻、不可禁用**的，避免纯工具客户端静默失去技能入口。
- 技能不会自动注入上下文，客户端要显式请求，所以闲置成本只有元数据列表。

**第 6 步：远程/受限网络的接法**
- 已有 Nabu Casa 或反代：装 **Webhook Proxy** app，启动后重启 HA，从日志取 `MCP Server URL (remote): https://xxxxx.ui.nabu.casa/api/webhook/mcp_xxxxxxxx` 填给客户端。
- 完全无法公网暴露又要用 ChatGPT/Codex：社区集成 [OpenAI Tunnel for HA-MCP](https://github.com/norpol/hass-codex-tunnel-mcp) 在 HA 内跑 OpenAI 的 `tunnel-client`，用只出站的连接把本地 MCP URL 接到 OpenAI 托管的隧道，再把 ChatGPT connector 指到同一 tunnel ID（见 FAQ 与 #1811）。

**第 7 步：出问题查 FAQ/Troubleshooting**（https://homeassistant-ai.github.io/ha-mcp/faq/），并注意 v7.3.0 起 `ha_config_set_yaml` 已移入 beta。

## 对应的研究问题

**1. 能力发现**：原文给出的“没想到可以交给 AI”的清单很具体——不只是控设备，而是：按自然语言创建带正确 trigger/action 的自动化；给 Lovelace 仪表盘增删卡片与资源；读自动化执行 trace 定位故障并给修法；在已有自动化上追加动作（先读、再改、再更新）；把多步操作封装成可复用脚本；在开启 beta 后带备份与校验地改 `configuration.yaml` 与 package 的顶层键；管 helper/区域/分组/标签/日历/蓝图；管备份、应用、HACS、设备与实体注册表；查历史与统计、抓摄像头快照、读 Z-Wave 配置参数（`ha_manage_radio` 的 `get_config_params` / `get_config_param`，即使对应配置实体被禁用或不存在也能读，默认走 Z-Wave JS 缓存）。

**2. 任务匹配**：原文明确按能力分档给不同配置——有延迟工具加载的客户端走全量目录；小模型、本地模型、会内联全部 schema 的客户端走 `ENABLE_TOOL_SEARCH=true` 的 BM25 检索式发现，并抬高上下文窗口；正式环境用组件或 streamable HTTP，不用 stdio（#1713）；纯工具客户端用 `ha_get_skill_guide`，支持 resources 的客户端用 `skill://`；ChatGPT/Codex 在防火墙后走 OpenAI Tunnel；远程用 Secret URL 起步、需要再加一层登录时用 `ha_auth` 或 OIDC。

**3. 条件供给**：要给的权限与信息写得很细——管理员身份（令牌或专用管理员账号，专用账号建议“允许登录 + 仅本地访问 + 管理员”）、客户端可达的连接 URL（webhook 或直连端口 9584 的 private 路径）、可写工具的组件与 beta 开关（`ENABLE_BETA_FEATURES` 是子开关的前置）、领域知识（skills）、以及反馈通道（trace、history、logs、`ha_get_operation_status`、`ha_report_issue`）。同时给了约束条件：每个客户端只配一种安装方式、不要同时跑两个安装、非管理员令牌功能受限、组件工具缺失时会返回带安装说明的错误。

**4. 主动推进**：原文的“持续完成”不是让模型一直在线，而是让模型**生成由时间/状态/事件触发的自动化与脚本**，之后由 Home Assistant 引擎长期执行——日落触发开灯、晨间例程、电影模式脚本等例子都属于这一类；再配合 trace/history 形成“执行—观察—修正”的闭环。这是“AI 写触发器、系统长期跑”的分工方式，可迁移到其他有调度引擎的场景。

**5. 效果验证**：有明确的内建验证机制——YAML 编辑带自动备份、校验与 config check；helper/集成编辑有快照、恢复前要求新的安全备份、恢复后校验持久化选项，并分别报告新的 config-entry ID、实体映射，冲突或校验失败时保留新 helper 与源备份并报出结果；占用中的实体 ID 在创建前即被拒绝；失败或不确定的恢复会报出结果与安全拒绝原因，要求先检查当前状态再重试；同一服务器上的 helper/集成编辑会等恢复完成，但其他 HA 客户端不在协调范围内。仓库还有 E2E Tests 的 CI 徽章。

## 与已有做法的关系

- **Claude Code（工具，adopt）**：README 直接把它列为一等客户端，给了专门的安装命令 `curl -LsSf .../install.sh | sh -s -- --claude-code`，并用 `/mcp` 确认连接，还点名它属于“支持延迟工具加载”的一类。
- **Agent skills（概念，adopt）**：强相关。README 用一整节论证“只给工具不给领域知识会产出难维护的配置”，把 `homeassistant-ai/skills` 作为内置 MCP resources 提供，并保留不可禁用的 `ha_get_skill_guide` 兜底——这是把“技能包 + 工具服务器”配套交付的一个可照抄范式。
- **Cursor（工具，watch）**：只在 Setup Wizard 的支持客户端列表中被提到（“Claude Code, Gemini CLI, ChatGPT, Open WebUI, VSCode, Cursor 等”），没有针对性配置说明。
- **GitHub Copilot（工具，drop）**：仅作为“会把全部工具 schema 内联、需要开工具搜索”的反面例子出现（GitHub Copilot CLI），与清单中的 drop 状态一致，没有新增可用信息。
- **OpenCode（工具，watch）**：原文未提及。

## 证据与局限

- 原文是仓库 README，属作者自述；除 **87 个工具** 的徽章与清单、E2E 测试 CI 徽章、stars 6806（当日 +790）之外，**没有任何效果量化数据**（没有任务完成率、耗时对比、故障率）。示例表里的五条“你说 → 会发生什么”是用法演示，不是实测记录。
- “stdio 有已知传输问题（#1713）”“同一服务器挂两条会导致连接挂起”“非管理员令牌功能受限”“不加领域知识会选错 helper / 过度用模板”都是作者主张，虽然给了 issue 编号，本次材料无法核对。
- 版本与日期需要核实：README 写的是 2026.8.0+ / 2026.11 Marketplace / 9.0.0（2026-10-28），与常见时间线不一致，落地前应对照仓库实际 release 与自己的 HA 版本；v7.3.0 把 `ha_config_set_yaml` 移入 beta，说明这批写工具仍在变动。
- 原文在“Enable search-based discovery”的工具表处被截断，beta 开关细节（`docs/beta.md`）、安全策略（`ha_manage_security_policy`）、`docs/in-process-server.md` 等只知存在、未见内容，相关步骤只能按 README 正文的概括执行，具体参数需查文档。
- 适用条件很窄：**只对 Home Assistant 用户有意义**。其余场景只能借用其结构（专用低权账号、默认只读、逐工具授权、审批门、改动前自动备份、领域技能包、按模型能力选择工具暴露方式），不能直接套用命令。
- 安全面需要特别提醒：这是把管理员级权限交给一个外部模型驱动的进程，README 自己也给了“令牌泄漏后到处可用”的警告；没有第三方安全审计信息。

## 怎么试、怎么验证

**最小试用（约 15 分钟，零风险）**
1. 用第 1 步的一行脚本连 demo 环境，重启客户端，问 **"Can you see my Home Assistant?"**，能正确答出环境即通过第一关。
2. 在 demo 里下一道有明确验收标准的任务，例如 *"Create an automation that turns on the porch light at sunset"*，然后**自己去核对生成的 trigger 与 action 是否正确**（不要相信模型的自述）。
3. 再给一道排障题：*"The motion sensor automation isn't working, debug it"*，看它是去看 trace 还是凭空猜——凭空的说明工具没被正确调用。

**接真实实例的小范围试用**
4. 用第 2 步装组件版，建**专用管理员账号（仅本地访问）**，先开 Read Only Mode，只放开读类工具。
5. 挑 3–5 个低风险、可回滚的真实任务（新建一个不关键的自动化、给测试仪表盘加一张卡片、给已有自动化加一个动作），逐个执行并记录。
6. 确认无误后再逐工具放开写权限，并保持“自动备份 + 用户审批”开启；文件/YAML 工具留到最后，且先不开。

**判断有没有改善的指标（建议全部手工记录，原文未提供任何基准）**
- **耗时**：同一任务“手工配置”与“自然语言 + 核对”的分钟数对比（建议同一批任务 A/B，至少 3 个任务）。
- **首次正确率**：agent 产出的自动化/脚本**未经修改即可用**的比例；以及需要几轮纠正。
- **返工与回滚率**：触发自动备份/恢复的次数，以及 `config check` 失败次数。这是安全性指标，比速度更重要。
- **排障效率**：给一个已知故障，agent 定位到正确原因（依据 trace/log）的比例与用时。
- **可维护性**：产出的自动化是否用了原生结构而非 Jinja2 硬绕、helper 类型是否选对——这是接不接 skills 的对照项：**先不接 skills 跑一遍，再接 skills 跑同一批任务**，比较返工率与纠正轮数，这是本次最值得验证的一条假设（作者声称但不给数据）。
- **稳定性**：一周内客户端连接失败/挂起的次数（尤其检验“一个客户端只配一种安装方式”这条纪律是否真的避免了挂起）。

**放弃条件**：若首次正确率低于手工、返工率高于 1/3，或出现需要恢复备份的破坏性改动，就退回只读模式，只把它当“系统巡检与排障助手”用。
