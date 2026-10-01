# thedotmack/claude-mem

- 结论：**值得一试**。可以在 Claude Code 上小范围试用：用 `npx claude-mem install` 装好后重启，让它在真实项目里自动捕获并注入跨会话记忆，再用检索命中率和重复交代背景的次数判断是否值得长期留下；理由是 README 给出了可直接照做的安装、配置和检索步骤，但效果数据（如 ~10x token 节省）只有作者主张，且夹带托管记忆与代币推广，需自行验证。
- 原文：https://github.com/thedotmack/claude-mem
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T10:28:00.722Z

## 是什么

Claude-Mem 是给 Claude Code 用的**跨会话持久记忆压缩系统**：它自动捕获会话中的工具使用观察（observations），生成语义摘要，并在后续会话自动注入，使 Claude 在会话结束或重连后仍保留对项目的连续认知。

README 自述的核心组件：

1. **5 个生命周期 hook**（对应 6 个 hook 脚本）：SessionStart、UserPromptSubmit、PostToolUse、Stop、SessionEnd
2. **Worker 服务**：本地 HTTP API，带 web 查看器 UI 和搜索端点，由 Bun 管理
3. **SQLite 数据库**：存 sessions、observations、summaries
4. **mem-search Skill**：自然语言查询 + 渐进式披露
5. **Chroma 向量库**：语义 + 关键词混合检索

版本 13.28.0，Apache-2.0 许可，Node >= 20。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Node.js 20.0.0+；Claude Code 最新版且支持插件；Bun 和 uv 缺失时会自动安装；SQLite 3 已捆绑。

1. **标准安装（Claude Code）**。运行后安装器先完成部署，再要求你在浏览器登录 claude-mem（邮箱 magic link，无需信用卡）。

```bash
npx claude-mem install
```

2. **想跳过登录/账号交互**：显式传 `--provider`，或设置 `CLAUDE_MEM_ONLINE_OPTIN=false`，或在 CI / 非交互 shell 中运行——安装器会不经过任何账号交互直接完成。

3. **改用插件市场安装（在 Claude Code 内）**：

```bash
/plugin marketplace add thedotmack/claude-mem

/plugin install claude-mem
```

4. **安装到其他 harness**（README 给出的入口）：

```bash
npx claude-mem install --ide opencode
npx claude-mem install --ide antigravity
npx claude-mem install --ide omp
npx claude-mem install --ide grok-bot
```

注意 README 说明：Grok Bot 没有 host hook，所以改为监听 chat log 文件；默认用托管记忆 CMEM Pro，本地 observer 需显式 `--provider host` 才启用；安装该插件**不会**顺带安装 Cursor。

5. **OpenClaw 网关上安装**（一条命令完成依赖、插件、AI provider 配置、worker 启动，可选把观察实时推送到 Telegram/Discord/Slack）：

```bash
curl -fsSL https://install.cmem.ai/openclaw.sh | bash
```

6. **重启 Claude Code**。此后新会话会自动出现此前会话的上下文。

7. **配置**：设置写在 `~/.claude-mem/settings.json`（首次运行自动创建默认值），可配 AI 模型、worker 端口、数据目录、日志级别、上下文注入设置。

8. **设置工作流模式与语言**（同时控制工作流行为和生成观察所用语言）：

```json
{
  "CLAUDE_MEM_MODE": "code--zh"
}
```

`code--zh`（简体中文）已内置，无需额外安装或更新插件；改完需重启 Claude Code 生效。语言模式遵循 `code--[lang]` 命名（如 `zh`、`ja`、`es`）。查看本地可用模式：

```bash
ls ~/.claude/plugins/marketplaces/thedotmack/plugin/modes/
```

9. **让 SessionStart 上下文包含所有 harness 的观察**（默认 `"false"`，只限当前 harness）：在 `~/.claude-mem/settings.json` 中设 `"CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES": "true"`，或在 viewer 设置里打开 **Include all sources at session start**。观察条数上限仍对所选来源整体生效。

10. **隐私控制**：用 `<private>` 标签把敏感内容排除在存储之外。

11. **检索三层工作流**（MCP 工具，先便宜后昂贵）：

```typescript
// Step 1: Search for index
search(query="authentication bug", type="bugfix", limit=10)

// Step 2: Review index, identify relevant IDs (e.g., #123, #456)

// Step 3: Fetch full details
get_observations(ids=[123, 456])
```

4 个 MCP 工具：`search`（全文检索索引，可按 type/date/project 过滤，约 50–100 tokens/结果）、`timeline`（某条 observation 或查询前后的时间线上下文）、`get_observations`（按 ID 批量取完整详情，约 500–1,000 tokens/结果，务必批量）。

12. **关闭 Grok Bot 的 awareness 推送**（把 needle observations——`decision`、`bugfix`、`security_alert`、`sensitive`——按 `- YYYY-MM-DD [awareness] …` 追加到该 bot 的 `memory/log/YYYY-MM.md`）时使用：

```bash
CLAUDE_MEM_GROK_BOT_AWARENESS_ENABLED=false
```

README 声明该推送不写 `profile.md`、user-memory 或 project memory。

13. **注意**：`npm install -g claude-mem` 只安装 **SDK/库**，不注册插件 hook、不搭建 worker 服务。装插件一律走 `npx claude-mem install` 或上面的 `/plugin` 命令。

14. **出问题时**：直接把问题描述给 Claude，troubleshoot skill 会自动诊断并给修复；也可生成完整 bug 报告：

```bash
cd ~/.claude/plugins/marketplaces/thedotmack
npm run bug-report
```

15. **Windows 提示**：若报 `npm : The term 'npm' is not recognized`，确认 Node.js/npm 已安装并加入 PATH，从 nodejs.org 装最新版后重启终端。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：AI 可自主对项目历史做检索（`search` → `timeline` → `get_observations`），即会话中主动查询过去会话沉淀的 observation，而不只是被动接收上下文——这是 README 明确描述的可交给 AI 的能力。
- **任务匹配**：明确面向 Claude Code（插件市场 + hook），并给出 OpenCode、Antigravity CLI、OMP、Grok Bot、OpenClaw 的安装入口。适用场景是**跨会话的长期项目**。README 未说明各 harness 下功能差异的细节。
- **条件供给**：这是该条目的核心。需要提供：插件/hook 注册权限（安装器负责）、本地 worker 服务、SQLite + Chroma 存储、可选 AI provider（托管 observer / 自备 OpenRouter 或 Gemini key / Anthropic plan）；信息供给由 hook 自动完成；隐私与注入范围由 `<private>` 标签和 settings.json 控制。
- **主动推进**：由 5 个生命周期 hook（SessionStart、UserPromptSubmit、PostToolUse、Stop、SessionEnd）**自动触发**，README 明确写 "No manual intervention required"；Grok Bot 场景因为无 host hook，改为轮询 chat log 文件。
- **效果验证**：README 只提出三层工作流可带来 **~10x token 节省**，未给出可复核的实验数据或对照方法。

## 与已有做法的关系

- **Claude Code（tool，adopt）**：claude-mem 是它的记忆层插件，属于对该条目的增强而非替代；安装走 `/plugin marketplace add thedotmack/claude-mem` + `/plugin install claude-mem`。
- **Context engineering（concept，study）**：README 直接链接了 *Context Engineering* 与 *Progressive Disclosure* 两篇最佳实践文档，三层检索就是渐进式披露的具体落地。
- **OpenClaw（tool，watch）**：README 提供专门的单行安装脚本 `install.cmem.ai/openclaw.sh`，可视为 OpenClaw 的一个记忆插件选项。
- **OpenCode（tool，watch）**：有 `--ide opencode` 安装入口。
- **Cursor（tool，watch）**：README 只说明装该插件**不会**安装 Cursor，未给出 Cursor 集成方式。
- **Greptile（tool，study）**、**Trendshift（source，watch）**：仅在 README 顶部的徽章/榜单中作为展示元素出现，与功能无关。

## 证据与局限

**来自原文的事实性内容**：版本 13.28.0；Apache-2.0；Node >= 20；系统依赖 Bun/uv/SQLite 3；5 个生命周期 hook + 6 个 hook 脚本；4 个 MCP 工具；三层检索工作流；设置文件位于 `~/.claude-mem/settings.json`；`code--zh` 已内置；安装命令与各 IDE 参数。仓库指标显示 95,042 stars（来源 metrics）。

**只是作者主张、没有实验支撑的**："~10x token savings"、"get up to 100% more usage from your plan"、"seamlessly preserves context"、自动运行的可靠性。README 没有给出任何基准测试、对照实验或用户案例数据。

**适用条件与风险**：

1. 强绑定 Claude Code 生态，其他 harness 只是安装入口，README 自承 Grok Bot 无 host hook、需改为监听日志文件。
2. 存在商业引导：安装后要求浏览器登录、签发 memory key、托管记忆 CMEM Pro 免费 14 天，到期后若不订阅会"自动回落到你的 Anthropic plan"——即默认路径涉及第三方托管与付费转化。
3. 夹带加密代币推广：README 末节推广 CMEM 代币并给出 BASE 合约地址，与记忆功能无技术关联，属需要警惕的噪音/利益信号。
4. Grok Bot 的 awareness 推送被明确标注为 **pilot**，且声明不写 profile.md / user-memory / project memory，说明该路径仍在试验。
5. 环境门槛：Node 20+、Bun、uv、Windows 上的 PATH 问题；`npm install -g` 是常见踩坑点（只装 SDK）。
6. 本材料仅来自仓库 README，未包含代码、issue 或第三方评测，无法验证其宣称的压缩与检索质量。

## 怎么试、怎么验证

**最小试用（建议 1 台机器、1 个已有项目、1–2 天）**：

1. 用 `npx claude-mem install`（或加 `--provider` / `CLAUDE_MEM_ONLINE_OPTIN=false` 跳过登录，避免默认进入托管记忆）安装，走非交互路径。
2. 在 `~/.claude-mem/settings.json` 里先设 `"CLAUDE_MEM_MODE": "code--zh"`，重启 Claude Code。
3. 在一个你连续做过多天的项目里进行 3–5 次带工具调用的会话（含一次 bug 修复）。
4. 开一个新会话，观察是否自动注入了此前项目上下文；再让 Claude 用 `search` → `get_observations` 主动回查历史，例如 `search(query="<你的 bug 关键词>", type="bugfix")`。
5. 用 `<private>` 标签包一段假敏感信息，验证它没有进入存储。

**判断有没有改善的指标**：

- **重复交代成本**：新会话中你需要重新解释项目背景的轮次/字数，装前 vs 装后对比（这是最直接、最不依赖厂商自述的指标）。
- **检索命中率**：`search` 返回的索引里，有多少条真正被 `get_observations` 取回并实际帮到当前任务；命中率低说明摘要质量有问题。
- **token 开销**：记录一次典型任务的 token 消耗，与不开记忆时对比，用来亲自验证 README 的 "~10x" 主张（可用 worker 的 web viewer 或 API 观测）。
- **错误注入率**：注入的上下文里出现与本项目无关、或已过期的观察（跨 harness 时尤其注意 `CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES` 默认关闭的原因）。
- **稳定性和环境代价**：worker 服务是否常驻稳定、是否出现过 hook 报错，以及引入 Bun/uv/本地服务带来的运维负担。

若第 1 项和第 4 项在两周内没有可感知改善，或必须依赖托管账号才能用，则退回 study 只借其"hook 自动捕获 + 摘要压缩 + 三层渐进检索"的设计思路，自行实现简化版。
