# feiskyer/claude-code-settings

- 结论：**值得一试**。可以照抄它的安装命令和 settings 模板，但只按需选装 1–2 个技能做小范围试用，不要整包采用——理由：安装/配置步骤具体可复制，但技能效果全凭作者描述、且其中模型名需按自己网关实际提供情况替换。
- 原文：https://github.com/feiskyer/claude-code-settings
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T14:28:10.257Z

## 是什么

`feiskyer/claude-code-settings`（MIT，约 1.6k stars）是一个 Claude Code 的配置集合仓库，通过 Claude Code 官方 plugin marketplace 分发。它把「技能（skills）+ 子代理（agents）+ 模型提供商配置模板 + 维护脚本」打包，用来给 Claude Code 增补能力：

- **12 个技能**：brainstorming、codex-skill、deep-research、github-fix-issue、github-review-pr、gpt-image-skill、grill-me、handoff、nanobanana-skill、skill-creator、translate、youtube-transcribe-skill
- **6 个子代理**：pr-reviewer、github-issue-fixer、instruction-reflector、deep-reflector、insight-documenter、ui-engineer
- **11 套 settings.json 模板**：GitHub Copilot、LiteLLM、DeepSeek、Qwen、SiliconFlow、Vertex AI、Azure、Azure AI Foundry、MiniMax（全球/中国端点）、OpenRouter
- **1 个维护脚本**：`update-cc-plugins.sh`

它的定位不是「一个新工具」，而是「给已有工具补上下文、补工具权限、补协作分工」的配置层——这正是本调研关心的「条件供给」和「任务匹配」环节。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：已装好 Claude Code，并能访问 Anthropic 官方 API 或自建网关。**

### 1. 安装主插件（推荐路径，两种等价方式）

方式一，在 Claude Code 会话内用 slash command：

```sh
/plugin marketplace add feiskyer/claude-code-settings

# 安装主插件（包含所有技能和代理）
/plugin install claude-code-settings
```

方式二，用命令行：

```sh
claude plugin marketplace add feiskyer/claude-code-settings

# 安装主插件（包含所有技能和代理）
claude plugin install claude-code-settings@claude-code-settings
```

注意：通过 Plugin 安装的技能需要重启会话才能加载。

### 2. 按需精简，不要全装

README 的 FAQ 明确建议精选技能。可改用 npx skills 逐个挑（该方式版本可能滞后于仓库最新）：

```sh
# 列出可用技能
npx -y skills add -l feiskyer/claude-code-settings

# 安装全部技能
npx -y skills add --all feiskyer/claude-code-settings

# 手动选择要安装的技能
npx -y skills add feiskyer/claude-code-settings
```

### 3. 手动配置 `~/.claude/settings.json`（不走 Plugin）

前提：`settings.json` **不通过 Plugin 配置，必须手动设置**。仓库根目录的 `settings.json` 是作者模板。核心是把下面两个变量指向你的提供商端点：

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_API_KEY`

作者模板默认指向 copilot-gateway 代理（`http://localhost:4141`）；换 LiteLLM Proxy 等网关就把 `ANTHROPIC_BASE_URL` 改为对应地址（如 `http://localhost:4000`）。

作者模板里的模型名（需按你网关实际提供的模型替换）：

```
ANTHROPIC_DEFAULT_SONNET_MODEL: claude-sonnet-5
ANTHROPIC_DEFAULT_OPUS_MODEL: claude-opus-5
ANTHROPIC_DEFAULT_HAIKU_MODEL: claude-haiku-4-5
```

模板中 `defaultMode` 为 `acceptEdits`（自动接受文件编辑但保留命令确认）。

### 4. 减少权限确认（可选，注意风险）

- 模板默认 `defaultMode: acceptEdits`
- 想进一步减少确认：在 `settings.json` 的 `permissions.allow` 里配允许列表
- 完全跳过确认可改为 `bypassPermissions`，但 README 明确提示「请了解其安全风险后再启用」

### 5. 用 GitHub Copilot 当模型提供商（零额外成本路径）

前提：已有 Copilot 订阅，且接受手动安装方式。

```sh
# 备份原有配置
mv ~/.claude ~/.claude.bak

# 克隆本仓库
git clone https://github.com/feiskyer/claude-code-settings.git ~/.claude

# 启动 Copilot Gateway 代理（监听 http://localhost:4141）
npx copilot-gateway@latest start --proxy-env

# 也可以用 tmux 在后台运行
# tmux new-session -d -s copilot 'npx copilot-gateway@latest start --proxy-env'
```

首次启动会提示设备认证：

```
Please visit https://github.com/login/device and enter code XXXX-XXXX to authenticate.
```

认证过期/401 时，重跑 `npx copilot-gateway@latest start --proxy-env` 重新完成设备认证。

### 6. VSCode 扩展（Claude Code 2.0+）不走 Claude.ai 订阅时的环境变量

在 VSCode `settings.json` 中配置：

```json
{
  "claude-code.environmentVariables": [
    { "name": "ANTHROPIC_BASE_URL", "value": "http://localhost:4000" },
    { "name": "ANTHROPIC_AUTH_TOKEN", "value": "sk-dummy" },
    { "name": "ANTHROPIC_MODEL", "value": "opusplan" },
    { "name": "ANTHROPIC_DEFAULT_SONNET_MODEL", "value": "claude-sonnet-5" },
    { "name": "ANTHROPIC_DEFAULT_OPUS_MODEL", "value": "claude-opus-5" },
    { "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL", "value": "gpt-5-mini" },
    { "name": "DISABLE_TELEMETRY", "value": "1" }
  ]
}
```

同时需要 `~/.claude/config.json` 的内容来跳过 claude.ai 登录。

### 7. 把 API key 加入已批准列表（解决「API Key 缺失或无效」）

在 `~/.claude.json` 中：

```json
{
  "customApiKeyResponses": {
    "approved": ["sk-dummy"],
    "rejected": []
  }
}
```

### 8. 一键更新已装插件

```sh
bash ~/.claude/scripts/update-cc-plugins.sh
```

### 9. 补上非官方 API 环境下的网页搜索

WebSearch 是 Anthropic 专有工具、仅限官方 API 环境。在其它环境要通过 MCP 服务器补齐，README 列了四个：Tavily MCP、Brave MCP、Firecrawl MCP、DuckDuckGo Search MCP（只给链接，未给安装步骤）。

### 10. 排查「技能没有自动触发」

按 README 给的五条逐项检查：

- 路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写，必须是 `SKILL.md`）
- Plugin 安装的技能需重启会话
- 检查是否双层嵌套（`skills/name/name/SKILL.md`），需上移一层
- 直接问 Claude：`What skills do you have access to?` 验证加载状态
- `disable-model-invocation: true` 的技能（如 grill-me、handoff）不自动触发，须用 `/skill-name` 手动调用

### 11. 几个可直接抄的工作流形态

- **deep-research**：把调研目标拆成可并行子目标 → 通过 `claude -p` 子进程执行 → 聚合 → 逐章精修与来源验证。工具选择策略为「已安装技能 → MCP 工具 → WebFetch/WebSearch」。产出目录固定为：

```
.research/<name>/
├── prompts/           # 子任务 prompt
├── child_outputs/     # 子进程输出
├── logs/              # 执行日志
├── raw/               # 原始数据缓存
└── final_report.md    # 最终报告
```

- **handoff**：`/handoff [下一次会话的重点方向]`，把当前对话压成交接文档，输出到 `$TMPDIR/handoff-YYYY-MM-DD-HHMM.md`，内容含背景与目标、已完成工作、当前状态、待办事项、推荐技能、关键上下文；引用已有产物用路径/URL 避免重复；自动对 API key、密码、PII 脱敏；对话过短时提示无需生成。
- **codex-skill**：把编码、代码审查、计划审查交给 OpenAI Codex 非交互执行。触发词包括 `codex`、`use gpt`、`full-auto`、`adversarial review`、`用codex`、`对抗式审查`、`第二意见`。要点：审查结果只呈现不自动改码；Codex 调用失败时如实报告而非代答；支持 JSON 结构化输出与 `resume --last` 增量恢复。依赖 Codex CLI（`npm i -g @openai/codex` 或 `brew install codex`）。
- **github-review-pr**：并行子代理多角度分析（含安全维度）+ 对抗式验证——质疑者需在 head SHA 处复读代码，findings 必须附 `file:line` 与原文引用；支持置信度评分、误报过滤、去重与一致性计数、增量复审、批量行内评论、干净 PR 自动 LGTM。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——AI 还能做哪些没想到交给它的工作**
有实质依据。README 的技能清单本身就是一份「可以外包给 AI 的工作」候选表：多 Agent 并行深度调研、YouTube 字幕提取、技术文章中译、图片生成/编辑、端到端修复 GitHub Issue（分析→建分支→实现→测试→提交 PR）、PR 多角度审查、方案的高强度追问式审查（grill-me）、会话交接文档生成、创建并基准测试新技能（skill-creator）。其中 handoff、grill-me、skill-creator 属于平时不太会想到交给 AI 的那一类。

**2. 任务匹配——什么工作适合怎样的模型、工具和协作方式**
有实质依据。给出了明确的分工规则：
- 编码/审查/计划审查交给 Codex（`codex-skill`），定位是「第二意见」和「对抗式审查」，且审查结果不自动改码；
- 图片生成默认走 Gemini（nanobanana-skill），只有用户明确指定 OpenAI/GPT 时才走 gpt-image-skill；
- 调研任务按「已安装技能 → MCP 工具 → WebFetch/WebSearch」的优先级选工具；
- 11 套 settings 模板按「已有订阅/网关/云环境/成本敏感」分场景选型（Copilot=零额外成本、DeepSeek=高性价比国内直连、Qwen=国内低延迟、OpenRouter=一个 key 多模型）。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈**
依据最充分的一条。仓库本质就是一份「供给清单」：
- **工具**：MCP（Tavily/Brave/Firecrawl/DuckDuckGo）补 WebSearch；Codex CLI、yt-dlp、chrome-devtools-mcp、Python 依赖（google-genai、Pillow、python-dotenv、openai）；
- **权限**：`defaultMode: acceptEdits`、`permissions.allow` 白名单、`bypassPermissions`（含风险提示）、`~/.claude.json` 的 `customApiKeyResponses.approved`；
- **端点与凭证**：`ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN`、`GEMINI_API_KEY`（`~/.nanobanana.env`）、`OPENAI_API_KEY`（`~/.gpt-image.env`）；
- **信息**：`CONTEXT.md` 术语表 + ADR（grill-me 过程中即时维护）、交接文档模板（handoff）。

**4. 主动推进——哪些工作可由时间、事件或状态触发并持续完成**
部分有依据，但机制较弱。README 说明技能「可通过 `/skill-name [参数]` 手动调用，或根据上下文自动触发」，并为每个技能列出触发词——这是一种「上下文/状态触发」。`github-fix-issue` 是端到端流程、`deep-research` 是可扩展的并行子进程编排、`update-cc-plugins.sh` 是一键批量维护。但**README 没有提供任何时间调度（cron/定时）或事件挂钩的具体配置**，也没有长期运行/状态持久化的做法（codex-skill 的 `resume --last` 是最接近的一项）。

**5. 效果验证——怎样判断确实改善了结果**
有可借鉴的机制，但都只停留在设计描述：
- `github-review-pr`：置信度评分、误报过滤、去重与一致性计数、增量复审，并要求 findings 附 `file:line` 与原文引用、质疑者在 head SHA 处复读代码——这是可迁移的「降低幻觉/降误报」验证范式；
- `skill-creator`：包含定量评估循环与描述优化、基准测试；
- `deep-research`：逐章精修与来源验证。
但没有任何一个技能给出实测数字或对照结果。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：本仓库是它的扩展配置层，不替代它。可直接叠加在已有 Claude Code 用法之上。注意它与清单已有条目是依赖关系——先有 Claude Code，再谈这里。
- **OpenAI Codex（adopt）**：`codex-skill` 把 Codex CLI 作为 Claude Code 内部的「第二意见/对抗式审查者」，这是一种清单里可能还没有的「双模型互审」协作方式，值得纳入手册。
- **DeepSeek（try）**：提供 `settings/deepseek-settings.json` 模板，标注为「DeepSeek v3.1，高性价比，国内直连」，可作为该条目落地时的具体配置样例。
- **GitHub Copilot（drop）**：本仓库给了它一条重返牌桌的路径——`copilot-settings.json`（已有订阅、零额外成本）+ copilot-gateway 代理。如果 drop 的原因是「作为编码代理不如 Claude Code」，那这条路径改变的是前提（把 Copilot 当模型提供方而非代理），建议复核该条目结论是否需要加注。
- **Tavily（watch）**：README 把 Tavily MCP 列为补齐 WebSearch 的首选之一，但**只给链接、无安装配置步骤**——不足以让它升级，只能作为该条目后续调研的线索。

## 证据与局限

**来自原文、可直接核实的内容**：安装命令（marketplace/slash command/npx skills/git clone 三种路径）、settings 模板清单（11 套及其适用场景）、技能与子代理清单、`update-cc-plugins.sh` 路径与调用方式、deep-research 产出目录结构、handoff 输出路径与文档结构、VSCode 环境变量 JSON、`~/.claude.json` 的 approved 列表 JSON、五条技能未触发排查步骤、三条 FAQ 结论（技能别全装、权限确认调节、401 重新认证）。

**只是作者主张、无数据支撑**：
- 所有技能的效果描述，如「逐章精修与来源验证」「干净 PR 自动 LGTM」「对抗式代码审查（结构化 JSON findings）」「定量评估循环」——无案例、无对照、无准确率。
- 「过多技能会增加上下文消耗、降低触发准确度」「建议精选」是经验性主张，README 未给测量方法。
- 「已有 Copilot 订阅，零额外成本」只算 token 成本，不计代理层稳定性与合规成本。

**无法从原文验证、需自行核对的地方**：
- 文中列出的模型名（`claude-sonnet-5`、`claude-opus-5`、`gpt-image-2`、`gpt-image-1.5`、`gemini-3.1-flash-image-preview`、`gemini-3-pro-image-preview`、`MiniMax M3/M2.7/M2`、`Qwen3-Coder-Plus`）无法核对是否为真实可用模型名；README 自己也提示「确保以下模型在你的账户中可用，否则需替换为你自己的模型名」。照抄配置大概率需要改成你网关实际提供的名字。
- 未给出任何性能、成本、成功率数字。star 数（1657）由外部指标给出，不是效果证据。

**适用条件与风险**：
- 前提是使用 Claude Code；非 Claude Code 的用户（如纯 Codex 用户）只能参考思路，README 只把 Codex 版配置指向另一个仓库。
- 手动安装会**覆盖 `~/.claude`**，README 自己要求先备份。
- `bypassPermissions` 有明确安全风险提示。
- `npx skills` 安装的技能版本可能滞后于仓库最新版。
- 依赖较多（Codex CLI、yt-dlp/chrome-devtools-mcp、Python 包、各厂商 API key），不是零成本开箱即用。

## 怎么试、怎么验证

**最小试用方式（建议两周内跑完，只碰一个仓库）**

1. 先不动全局配置：用 `/plugin marketplace add feiskyer/claude-code-settings` + `/plugin install`，只装，不改 `~/.claude/settings.json`。
2. 选 **2 个**技能，优先级建议：
   - `handoff`（手动调用、低风险、见效快，适合检验「跨会话上下文供给」）
   - `github-review-pr`（如果你有 PR 审查场景，它能检验「验证机制」这一最弱环节）
   - 备选 `codex-skill`（如果清单里 OpenAI Codex 已在用，正好测「双模型互审」）
   不要一次装 12 个——README 自己的主张就是全装会降触发准确度，先别把这条主张变成你实验的干扰项。
3. 在同一个仓库、同一类任务上建立两周对照：一半任务用原方式，一半用新技能。
4. 记录基线：跑之前先量一周现状数据。

**判断有没有改善的指标**

| 试验对象 | 指标 | 基线怎么取 |
|---|---|---|
| github-review-pr | 每个 PR 发现的真问题数、误报数（真问题/总 findings）、审查耗时、是否需要人工补审 | 人工 review 或原 AI review 的近 5–10 个 PR |
| handoff | 交接后新会话冷启动到进入正题所需轮数、是否丢失关键上下文、是否有凭证泄漏 | 不加 handoff 直接开新会话的记录 |
| codex-skill | 对抗式审查比单模型多发现的真问题数、失败时是否如实报告（而非编造） | 只用 Claude Code 的同类审查 |
| 全局 | 技能触发准确率：自动触发次数 / 你期望触发次数（FAQ 已给查法：直接问 `What skills do you have access to?`） | 装 2 个 vs 装 12 个对比，顺带验证它的「技能过多影响性能」主张 |

**两个建议同时验证的假设**（都是 README 的主张，成本低、结论可迁移）

1. 「技能全装会降触发准确度」——装 2 个和装 12 个各跑一批同类请求，比触发准确率和响应延迟。
2. 「并行子代理 + 对抗式验证能降低误报」——用同一批 PR 对比单遍审查和 `github-review-pr` 的误报率。

**止损条件**：如果按 FAQ 排查五条后技能仍不自动触发，或模型名替换后仍报 API 错误，或两周内没有一项指标优于基线，就不要继续扩装，把结论退回为「思路可研读（study）」，只保留 handoff 这类手动调用的低风险技能。
