# rohitg00/pro-workflow

- 结论：**值得一试**。先在单个项目上装 Claude Code 原生插件，只跑通 /doctor、/learn-rule、/wrap-up 三个动作，确认纠正能被持久化并在新会话自动加载后再考虑启用 wiki 与自动研究循环；理由是 README 给出了可直接复制的安装与命令流程、可把重复纠正转成可检索的持久规则，但全文没有任何效果数据，且技能/命令数量在文档内自相矛盾，不足以直接采用。
- 原文：https://github.com/rohitg00/pro-workflow
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T14:26:53.216Z

## 是什么

Pro Workflow（rohitg00/pro-workflow，MIT，2.9k stars）是一个 Claude Code 插件 / 技能包：在每次会话下面放一个 SQLite 库（`~/.pro-workflow/data.db`），提供三类能力。

- **自我纠正记忆**：每次纠正被写成一条规则，FTS5 可搜索，`SessionStart` 时自动加载；示例流程为「会话 1 你说『别在测试里 mock 数据库』→ Claude 提议规则 → 你批准 → 存入 SQLite；会话 2 自动加载并生效」。
- **知识平面**：持久研究 wiki（磁盘 markdown + FTS5 影子索引），可在任意会话查询，可选由自动研究循环（预算封顶的 BFS）自行扩充。
- **质量门与可观测**：LLM 驱动的 hook、确定性 git/密钥守卫、compaction 感知的状态保存、成本跟踪、MCP 开销审计。

README 声明的规模：41 个 skill、8 个 agent、23 个 slash command、33 个 hook 脚本覆盖 22 个事件；同时支持通过 skills add 装到 Cursor、Codex、Gemini CLI 等 32+ agent。

## 具体做法（编号步骤）

**前提**：已安装 Claude Code；手动安装路径需要本地有 Node/npm（要 `npm install && npm run build` 构建 SQLite 组件）；wiki 的向量检索和多模型审议需要额外 API key（有成本），本地 BM25 检索、学习记忆和确定性守卫不需要凭据。

1. **原生安装（Claude Code，推荐起步路径）**

   ```bash
   /plugin marketplace add rohitg00/pro-workflow
   /plugin install pro-workflow@pro-workflow
   ```

2. **安装到其他 agent**（Cursor、Codex、Gemini CLI、Windsurf、OpenCode、Kiro、Amp、Goose、Roo 等 30 个；README 明确列出 cursor、codex、gemini-cli、opencode、github-copilot、droid、cline、goose、windsurf、qwen、roo 等）

   ```bash
   npx skills add rohitg00/pro-workflow
   ```

   注意：必须用 `owner/repo`（GitHub 形式），不能用裸名，因为 skills add 从 `owner/repo` 解析来源；装完执行 `skills sync` 把技能注册进目标 agent 的配置。

3. **手动安装（任意 agent、任意 OS）**

   ```bash
   git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
   cd /tmp/pw && npm install && npm run build

   cp -r /tmp/pw/templates/split-claude-md/* ./.claude/
   cp -r /tmp/pw/skills    ~/.claude/skills/
   cp -r /tmp/pw/commands  ~/.claude/commands/
   cp    /tmp/pw/hooks/hooks.json ~/.claude/hooks.json
   ```

   目标目录按你的 agent 调整（如 `~/.cursor/rules/`、`~/.gemini/extensions/`）。

4. **首次冒烟测试**

   ```bash
   /doctor              # confirms SQLite store, hooks, skills load
   /wrap-up             # runs the end-of-session ritual (no-op on fresh install)
   ```

   若 `/doctor` 报 `KB: missing`，补构建：

   ```bash
   cd ~/.claude/plugins/*/pro-workflow && npm install && npm run build
   ```

5. **先只记这五个日常命令**（README 称覆盖 80% 日常使用）

   | 时机 | 命令 | 作用 |
   |---|---|---|
   | 同一个纠正又重复了 | `/learn-rule` | 把纠正固化成规则，之后每次 `SessionStart` 自动加载 |
   | 一次编码会话结束 | `/wrap-up` | 审计改动、持久化学习、写交接文档 |
   | 要研究一个主题 | `/wiki init <slug>` | 起一个持久 FTS5 wiki，之后提到该主题时自动注入 |
   | 卡在难 bug 上 | `/develop` | Research → Plan → Implement，各阶段之间有验证门 |
   | 提 PR 之前 | `/smart-commit` | 质量门、暂存区审查、conventional commit 信息 |

6. **知识平面试用（60 秒 tour 原文命令）**

   ```bash
   # 1. Self-correction (existing)
   /learn-rule          # capture a correction
   /wrap-up             # end session, persist learnings, audit changes
   /insights            # heatmaps, trends, productivity

   # 2. Knowledge plane (v3.3, new)
   /wiki init agent-memory --title "Agent Memory" --flavor research
   /wiki page agent-memory wiki/concepts/episodic-memory.md --type concept
   /wiki ask "what is episodic memory" --wiki agent-memory

   # 3. Auto-research (budget-capped, opt-in)
   /wiki seed agent-memory "memory consolidation in agents"
   /wiki research agent-memory --max-pages 5 --budget-usd 0.50

   # 4. Hybrid retrieval (BM25 + vector RRF, optional)
   /wiki embed agent-memory                       # configure an OpenAI or Voyage key for this plugin
   /wiki hybrid "consolidation patterns" --wiki agent-memory

   # 5. Multi-LLM deliberation (transcript persists as a wiki page)
   /wiki council "should we adopt episodic memory?" --wiki agent-memory

   # 6. Browse the wiki visually (single-file HTML, S3-shareable)
   /wiki view agent-memory
   open ~/.pro-workflow/wikis/agent-memory/derived/viewer.html

   # Kill switch for any auto loop
   touch ~/.pro-workflow/STOP
   ```

   行为说明（原文）：`UserPromptSubmit` 在提示命中索引主题时自动加载前 3 条 wiki 命中；`SessionStart` 列出已注册 wiki 和最近学习记录。

7. **配置质量门与权限**：参考仓库里的 `settings.example.json`（权限规则、`autoMode` 块、sandbox、输出风格、自动压缩、自定义 spinner）。注意：分类器只从 `~/.claude/settings.json` 读 `autoMode`，所以该块要放在那里。

8. **配置 MCP**：参考 `mcp-config.example.json`，示例为 context7（实时文档查询）、playwright（浏览器自动化，最省 token）、GitHub（PR/issue/代码搜索）。原文明确定规则：**先上三个 MCP，只在有具体需求时再加**。

9. **按需配置环境变量**（不配也能跑本地 BM25 + 学习记忆 + 确定性守卫）

   | 变量 | 用途 |
   |---|---|
   | `WIKI_ROOT` | 覆盖默认 `~/.pro-workflow/wikis` |
   | `PRO_WORKFLOW_OPENAI_API_KEY` / `PRO_WORKFLOW_VOYAGE_API_KEY` | 独立运行时的 embedding 凭据 |
   | `PRO_WORKFLOW_ANTHROPIC_API_KEY` / `_OPENAI_` / `_OPENROUTER_` / `_FIREWORKS_` / `LLM_COUNCIL_BASE_URL`+`PRO_WORKFLOW_LLM_COUNCIL_API_KEY` | council 与 survey 凭据 |
   | `WIKI_LOOP_BUDGET_USD` / `WIKI_LOOP_MAX_PAGES` / `WIKI_LOOP_MAX_DEPTH` | 单次研究循环的覆盖参数 |
   | `PRO_WORKFLOW_GITHUB_TOKEN` | 独立运行时的 GitHub 研究 token（公开请求可不配） |

   注意原文的两条约束：敏感值放在 Claude Code 的安全凭据存储里、经内置 `providers` MCP 传给后端；普通环境变量如 `OPENAI_API_KEY`、`GH_TOKEN` **不再被自动读取**，独立 CLI 用户必须显式用 `PRO_WORKFLOW_*`。

10. **可选系统 1 分类器**（默认关闭）：`PRO_WORKFLOW_SYSTEM_ONE=laya`（本地 Laya 服务）或 `=jev`（需 TypeSafe key，或 `PRO_WORKFLOW_TYPESAFE_API_KEY`），只给快速纠正提示和风险建议，**从不允许或拒绝工具调用**。

11. **知道数据落在哪**（便于备份/迁移/项目级共享）

    ```text
    ~/.pro-workflow/
    ├── data.db                 # learnings, sessions, wikis (registry), wiki_pages (+FTS5),
    │                           # wiki_sources, wiki_claims, wiki_seeds, wiki_embeddings,
    │                           # learnings_wiki
    ├── wikis/<slug>/           # global-scope wikis (default location)
    ├── council/<session-id>/   # llm-council transcripts
    ├── fetchers/               # user-supplied custom source fetchers
    ├── tick.log                # cron-driven research-tick log
    └── STOP                    # touch this file to halt every research loop
    ```

    项目级 wiki 放在 `<project>/.claude/wikis/<slug>/`，可提交进版本库。

## 对应的研究问题

**1. 能力发现**
- 会话启动自动加载历史学习并列出已注册 wiki；提示提交时若命中索引主题，自动注入前 3 条 wiki 命中——把「回忆该用哪条经验/资料」从人工检索变成自动供给。
- 自动研究循环可自行扩充 wiki（README 声称「一周自动研究后，你的主题 wiki 比最初参考的精选列表更密」）。
- `reread-tracker`：记录每次完成的 Read，当同一个未改动文件被再次读取时提示 Claude；可用 `config.json` 里的 `reread_tracker.block: true` 或 `PRO_WORKFLOW_REREAD_BLOCK=1` 阻止。这是「AI 自己发现自己在重复劳动」的一个具体机制。

**2. 任务匹配**
- 硬 bug → `/develop`（Research → Plan → Implement 带验证门）；大改动 → `batch-orchestration` / `parallel-worktrees`（并行 worktree agent）；高风险决策 → `llm-council`（provider-agnostic 三阶段审议，`Promise.allSettled` 保证单 provider 失败不中断）；提 PR 前 → `/smart-commit`；不熟的代码区 → `module-map`。
- agent 分工明确：planner（只读、需批准）、reviewer（清单式审查）、scout（带置信度门控、后台、worktree 隔离）、debugger（假设驱动的系统排查）、context-engineer（只读上下文分析）、permission-analyst、cost-analyst。
- 模型/供应商层面：`llm-council` 和 `survey-generator` 都是 provider-agnostic（Anthropic/OpenAI/OpenRouter/Fireworks/自定义）。

**3. 条件供给**
- 信息：`templates/split-claude-md/` 提供模块化 CLAUDE.md；wiki 页与 `sources.md` 的行和 citation ID 对齐。
- 工具：`hooks.json`（33 脚本 / 22 事件）、MCP（context7、playwright、GitHub，先三个）、`fetchers/` 放自定义来源抓取器、`skills sync` 注册技能。
- 权限：`settings.example.json` 的权限规则 + `autoMode`（且必须放在 `~/.claude/settings.json`）；`permission-tuner` 依据拒绝模式生成 allow/deny 规则。
- 凭据：embedding / council / GitHub 用 `PRO_WORKFLOW_*` 显式提供；插件模式下走 Claude Code 安全凭据存储 + `providers` MCP。
- 反馈闭环：纠正 → `/learn-rule` 固化为规则；`Stop` 事件的 `learn-capture.js` 自动捕获 `[LEARN]` 块（并解析 `Wiki: <slug>`）；`/replay` 把过往学习拉回当前任务。

**4. 主动推进**
- 22 个 hook 事件构成触发面：`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`、`PreCompact`、`PostCompact`、`SubagentStart/Stop`、`TaskCreated/Completed`、`PermissionRequest/Denied`、`PostToolUseFailure`、`TeammateIdle`、`StopFailure`、`FileChanged`、`ConfigChange`、`Notification`、`Setup`、`CwdChanged`。
- 具体触发链：`FileChanged` 时 `file-changed.js` 在 wiki 树内编辑会入队 verify-seeds；README 提到 reactive file-watcher seed enqueue 与 cron-tick driver（`tick.log`）；`/wiki research` 是预算封顶（`--budget-usd`、`WIKI_LOOP_BUDGET_USD`）的 BFS，带收敛检测、kill-switch、原子 seed 领取、try/finally 状态保护。
- `PreCompact`/`PostCompact` 存下并在之后重新注入关键上下文摘要，跨压缩周期保持状态。
- 停止机制：`touch ~/.pro-workflow/STOP` 暂停所有研究循环。

**5. 效果验证**
- `/insights`：会话分析、纠正热力图、趋势、生产力。
- `/doctor`：设置健康检查，v3.3 起含 wiki 知识库与 council provider 段落。
- `/cost-tracker`（会话成本与优化建议）、`/mcp-audit`（MCP 服务器 token 开销）、`thoroughness-scoring`（实现完整度评分）、`token-efficiency`（反谄媚 + 工具调用预算）。
- README 给的验证叙事是「第 50 次会话时纠正率接近 0，wiki 有 200 条带引用主张」，但这只是演示性描述，原文未给出读取口径或判定阈值。

## 与已有做法的关系

- **Claude Code（adopt）**：本项目是 Claude Code 的叠加层，依赖其 plugin marketplace、hooks、slash command，不替换底座。装它等于给已有 adopt 项加一层记忆与知识平面。
- **obra/superpowers（study）、gstack（study）**：README 的对比表把二者列为同类替代，并声称 Pro Workflow 独有 self-correcting memory（SQLite+FTS5）、持久研究 wiki、预算封顶自动研究循环、混合检索（BM25+vector+RRF）、多 provider council、`type: "prompt"` 的 LLM hook、权限拒绝分析、compaction 感知状态、成本跟踪、MCP 开销审计、跨 32+ agent。可作为「同类工具怎么选」的对照材料，但该表由项目自己给出，未独立验证。
- **Context engineering（study）**：本项目把它落成了 `context-engineering` skill（Write/Select/Compress/Isolate 框架）+ `context-optimizer` + `compact-guard`，并有 `references/context-engineering.md`。这是该概念的可用实现样本。
- **Context Mode（watch）**：功能方向重叠（上下文预算、compaction 状态保存），README 未直接比较。
- **Cursor、goose、OpenCode、Cline（均 watch）**：README 的 skills add 支持列表里明确出现 cursor、goose、opencode、cline，说明它是这些 agent 的跨平台技能来源；但 README 同时说明这些 agent 没有一等插件，只能装技能包，能力和 Claude Code 原生不等价。
- **Laya（watch）**：`PRO_WORKFLOW_SYSTEM_ONE=laya` 可直接接本地 Laya 服务做快速纠正提示（默认关闭，且不参与工具调用放行）。
- **arXiv（try）**：`wiki-research-loop` 的可插拔 fetcher 明确包含 web / arXiv / GitHub 及自定义来源。
- **skills.sh（try）**：`npx skills add` 就是 skills.sh 的 CLI，README 多处链接该注册表。

## 证据与局限

**原文给出的可核实内容**：可复制的安装命令（marketplace 两句、skills add 一句、手动 clone+copy 六句）、可直接用的 slash 命令与参数（`/wiki init|page|ask|seed|research|embed|hybrid|council|view`、`/doctor`、`/wrap-up`、`/learn-rule`、`/smart-commit`、`/insights`、`/parallel` 等）、完整环境变量表、存储目录树、hook 事件清单与部分脚本名、`STOP` kill switch、`re-read` 阻止开关（`read_tracker.block` / `PRO_WORKFLOW_REREAD_BLOCK=1`）。这些是可照做的部分。

**只是作者主张、无独立数据**：
- 「After 50 sessions you barely correct anything」「a week of auto-research, your wiki … denser than the curated lists」；
- 对比表里对 Superpowers/ECC/gstack/GSD 的「No」判定；
- 引用的 Karpathy、Boris Cherny、Thariq Shihipar 的推文是他人观点，不是本项目实测；
- 全部规模数字（41 skills、8 agents、23 commands、33 hooks、22 events）。

**文档内部自相矛盾（降低了采信度）**：标题区写「41 skills · 8 agents · 23 commands · 33 hook scripts across 22 events」，对比表却写「Skills 34 / Commands 22 / Hook events 22」，正文又写「41 skills」「23 commands」。同一份 README 内计数不一致。

**适用条件与风险**：
- 只对重度使用 Claude Code（或其他被支持 agent）的开发者有价值；非编码类工作没有对应证据。
- 向量检索、council、survey 需要额外 API key 和真实花费；自动研究循环是会产生费用的循环任务，必须用预算参数和 `STOP` 文件兜底。
- 生态变动快，README 明确写 2026 年 `windsurf` 已改名 Devin Desktop、`gemini-cli` 被 Antigravity CLI 取代，适配器名字仍可解析但指向产品已变。
- 本次只有 README，没有 skill 源文件与 hook 脚本内容，所以「自动注入命中」「纠正自动捕获」等行为只能按文档描述理解，无法核验实现细节。

## 怎么试、怎么验证

**最小试用（建议 1～2 周、单个项目、不开任何付费能力）**
1. 装 Claude Code 原生插件（步骤 1 的两条命令）。
2. `/doctor` 必须通过；报 `KB: missing` 就先按步骤 4 补构建。
3. 只启用三件事：`/learn-rule`、`/wrap-up`、`/replay`。先不碰 `/wiki research`、`/wiki embed`、`/wiki council`（都要 key 和花费）。
4. 每天结束跑一次 `/wrap-up`；每当出现「这话我上周说过」时立刻 `/learn-rule`。
5. 一周后再加 `/wiki init <你的主题>` + `/wiki ask`，验证提示提交时是否真的自动带出命中。
6. 全程保留 `touch ~/.pro-workflow/STOP` 作为一键止损；需要破坏性操作时开 `/safe-mode`。

**判断有没有改善的指标（做前后各 N 个会话的基线对比）**
- 同一纠正的重复次数：`/insights` 的纠正热力图/趋势，加 `/search` 看既有规则是否被命中——核心指标是「同一纠正只出现一次」。
- 每次新会话的启动成本：你要重新解释项目约定的时间（主观记录即可）。
- 返工率：被 `/wrap-up` 审计出来的改动问题数量。
- 成本与 token：`/cost-tracker` 的每任务成本、`/mcp-audit` 的 MCP 开销（用来验证「先三个 MCP」这条规则是否成立）。
- wiki 是否真有用：`/wiki ask` 的命中是否被你在会话里实际采纳，而不是只看到注入。
- 反例基线：准备一周不装插件、一周装插件的对照，别只看作者宣称的「第 50 次会话纠正率接近 0」。

**明确不要据此下结论的点**：自动研究循环的产出质量（无评测数据）、跨 agent 安装后的等价性（README 自述非一等支持）、对比表里的竞品判定。
