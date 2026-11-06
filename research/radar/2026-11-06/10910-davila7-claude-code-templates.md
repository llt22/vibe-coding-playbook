# davila7/claude-code-templates

- 结论：**值得一试**。先在一个仓库里挑 1–2 个组件（优先 loops、hooks、MCP）按 README 的命令装上做小范围试用，而不是整包铺开；因为原文给了可直接复制执行的安装命令和清晰的组件分类，但没有给出任何组件质量或效果数据，且安装会写入项目配置、执行 hook 脚本、接入外部服务凭证。
- 原文：https://github.com/davila7/claude-code-templates
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T10:50:55.531Z

## 是什么

davila7/claude-code-templates 是 Anthropic Claude Code 的「现成配置」开放目录 + 配套 CLI（npm 包 `claude-code-templates`，MIT）。README 自述收录约 1,900 个组件，一条命令可装；官网 aitmpl.com 可搜索目录、预览每个组件会写入的每个文件、并把多个组件拼进同一条安装命令。

组件类型与数量（README 表格，当前精确数在 `dashboard/public/counts.json`）：

| 类型 | 数量 | 举例 |
|---|---|---|
| Skills | 890+ | PDF 处理、前端设计、代码审查 |
| Agents | 420+ | 安全审计员、前端开发、数据库架构师 |
| Commands（斜杠命令） | 280+ | `/generate-tests`、`/optimize-bundle-size`、`/security-audit` |
| MCPs（外部服务集成） | 100+ | GitHub、PostgreSQL、Stripe、Supabase、Sentry |
| Settings | 75+ | 超时、权限、状态行 |
| Hooks（自动化触发） | 60+ | conventional commits、阻断直接 push |
| Mods（改 Claude Code 自身界面/行为，需 2.1.287+） | 45+ | 密钥脱敏、受保护路径 |
| Loops（带目标/间隔/停止条件的自主工作流） | 18 | docs sweep、build-test-fix、adversarial review |
| Sandboxes | 11 | E2B、Cloudflare、Docker |
| Templates（整项目配置） | 14 | 语言/框架脚手架 |

另附三个本地工具：Analytics（localhost:3333，会话实时状态与用量）、Conversation Browser（localhost:9876，检索历史会话）、Health Check（安装与项目配置诊断）。两个 dashboard 只监听 127.0.0.1 且只应答 localhost。

## 具体做法

**前提**：本机有 Node/npm（用 `npx`），已安装并可使用 Claude Code；在目标项目目录下执行；Mods 类组件要求 Claude Code 2.1.287+；安装会改动项目内的 `.claude` 等配置，先在干净分支或临时仓库试。

1. 先在网页目录预览再装。打开 aitmpl.com，搜索组件，**逐个查看它会写入哪些文件**，再把多个组件组合成一条安装命令。这一步不要跳过——安装动作等于往仓库写配置。

2. 交互式浏览与安装（不确定装什么时用）：

```bash
npx claude-code-templates@latest
```

3. 装单个组件（四类各一条，按需选）：

```bash
npx claude-code-templates@latest --skill creative-design/frontend-design --yes
npx claude-code-templates@latest --agent development-tools/code-reviewer --yes
npx claude-code-templates@latest --command performance/optimize-bundle-size --yes
npx claude-code-templates@latest --setting mcp/mcp-timeouts --yes
npx claude-code-templates@latest --hook git/conventional-commits --yes
npx claude-code-templates@latest --mcp database/postgresql-integration --yes
npx claude-code-templates@latest --mod security/secret-redactor --yes
```

4. 装一条完整开发栈（组合安装）：

```bash
npx claude-code-templates@latest --agent development-team/frontend-developer --command testing/generate-tests --mcp integration/github-integration --yes
```

5. 装自主循环（README 注明会自动一并装上该 loop 依赖的组件，这是「主动推进」类能力最省事的切入点）：

```bash
npx claude-code-templates@latest --loop engineering/docs-sweep-loop --yes
```

6. 装完做一次安装健康检查，确认配置没写坏：

```bash
npx claude-code-templates@latest --health-check
```

（`--health`、`--check`、`--verify` 是别名。）

7. 查看当前各作用域（plugins/skills/commands/hooks/MCPs）到底装了什么，便于回滚——用 stack viewer mod，然后在 Claude Code 里执行 `/stack`：

```bash
npx claude-code-templates@latest --mod ui/stack-viewer
```

8. 需要观察使用情况时启动 Analytics（127.0.0.1:3333）：

```bash
npx claude-code-templates@latest --analytics
```

9. 需要翻查历史会话时启动 Conversation Browser（127.0.0.1:9876）：

```bash
npx claude-code-templates@latest --chats
```

要从另一台设备访问，README 指定用 SSH 端口转发（公开的 `--tunnel` 已在 1.31.0 移除）：

```bash
ssh -L 9876:localhost:9876 <host>
```

10. 注意版本漂移：1.31.0 移除了 `--plugins`、`--skills-manager`、`--command-stats`、`--hook-stats`、`--mcp-stats`、`--agents`、`--chats-mobile`、`--teams`、`--2025`、`--studio`、`--sandbox`、`--tunnel`、`--create-agent`、`--list-agents`、`--update-agent`、`--remove-agent`、`--clone-session`；误用时会打印替代方式。照抄旧教程的命令会失败。

## 对应的研究问题

**1. 能力发现（有依据）**：890+ skills 与 420+ agents 的目录本身就是一份「别人已经想到并封装好的 AI 工作」清单——PDF 处理、前端设计、代码审查、安全审计、数据库架构、bundle 体积优化、测试生成。要发现「还能交给 AI 什么」，直接按目录名扫一遍比自己想更高效。

**2. 任务匹配（部分有依据）**：原文给出的是「工作形态」维度的分工——可复用的能力放 Skill、领域专家放 Agent、一次性动作放斜杠 Command、外部系统访问放 MCP、行为约束放 Settings/Hook、改工具本身行为放 Mod。它没有给出任何「不同任务该用哪个模型」的依据，这部分不能引用。

**3. 条件供给（有依据，且是本文最强项）**：MCP 组件（GitHub/PostgreSQL/Stripe/Supabase/Sentry）提供外部工具与数据接入；Settings 组件（超时、权限、状态行）提供权限与运行条件；Hooks 组件提供自动化反馈闸门（如阻断直接 push、conventional commits 校验）。这正是「信息、工具、权限、反馈」四类供给的具体装载方式。

**4. 主动推进（有依据）**：Loops 组件被明确定义为「带目标、间隔和停止条件的自主工作流」，示例包括 docs sweep、build-test-fix、adversarial review；Hooks 提供事件触发。安装 loop 会自动补齐依赖组件，说明它是一套可独立运行的持续工作机制，而非单个提示词。

**5. 效果验证（仅部分有依据，需降级理解）**：`--health-check` 验证安装与项目配置是否健全；`--analytics` 提供实时状态检测与用量指标；Conversation Browser 可回看会话。但这些是「活动与配置指标」，不是「结果是否改善」的指标，原文未给出任何效果评估方法或对照数据。

## 与已有做法的关系

- **Claude Code（adopt）**：本仓库是 Claude Code 的组件供给层，完全依附于它；Mods 类还需 2.1.287+ 版本。清单里已 adopt Claude Code，则本条目可作为其「配置装载器」补充，不构成替代。
- **NVIDIA SkillSpector（try）**：README 说明每个 PR 都经 Claude Code 的 plugin validator 检查并由 NVIDIA SkillSpector 扫描——即本目录的组件质量闸门来自该项目。清单中它已标 try，说明这道闸门本身仍属试验阶段，这直接限制了本目录的可信度上限。
- **obra/superpowers（study）**：其 14 个 workflow skills 被列为本目录的来源之一。也就是说，清单里处于「研读」状态的思路，在这里变成了可直接 `npx` 安装的形态——这正是从 study 走向 try 的现成通道。
- **Trendshift（watch）**：仅出现在徽章与榜单链接中，无实质内容关联。

## 证据与局限

**原文给出的可核实信息**：组件类型与数量表（并指向 `dashboard/public/counts.json` 作为权威计数）；可复制的 CLI 命令与参数名；1.31.0 的移除清单（说明维护活跃但接口不稳定）；三个本地工具及其监听地址限制；来源与授权归属清单（K-Dense、anthropics/skills、obra/superpowers、awesome-claude-code 等，各自保留原始许可）。仓库指标显示 33,155 stars。

**只是作者主张的部分**：称之为「Ready-to-use」是自我描述，原文没有任何组件质量评测、成功率、安装后效果对比数据；「组合成一条命令」的顺畅度也无实测。890+/420+ 这类数字会随提交变化，且数量不等于质量。

**适用条件与风险**：
- 安全面最大：安装即写入项目配置文件；Hooks 是可执行脚本；MCP 组件会把 Claude Code 接到 GitHub、数据库、Stripe、Sentry 等真实系统，涉及凭证与写权限。必须先在网页目录预览文件内容。
- 授权混杂：项目本体 MIT，但收录组件保留各自原始许可（如 Apache 2.0、CC0），用于商业项目需逐项核对。
- 会话隐私：Analytics 与 Conversation Browser 读取的是完整对话历史，虽然只监听 127.0.0.1，但仍属敏感数据面，别在共享机器上常开。
- 版本脆弱性：1.31.0 一次性移除 17 个参数，说明 CLI 接口仍在快速变动，写进手册的命令需要标注版本。
- 原文为 README，未包含 docs.aitmpl.com 的细节，因此各组件的具体内容（提示词、hook 脚本）无法在此评估。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：在一个非关键仓库的新分支上，只装三样东西——1 个 Hook（如 `git/conventional-commits`，验证反馈闸门）、1 个 Loop（如 `engineering/docs-sweep-loop`，验证持续触发）、1 个 MCP（选一个只读权限的服务，验证工具接入）。装前在 aitmpl.com 逐个预览写入文件；装后跑 `--health-check`；用 `/stack` 记录清单以便一键回滚。

**对照组设计**：同一类任务在装前装后各做 3–5 次，保持任务同质。

**判断是否改善的指标（按研究问题对齐）**：
- 主动推进：Loop 是否按间隔自动跑起来、停止条件是否按预期触发、无人值守完成的任务数；Hook 拦截次数（如被挡下的直接 push、被拒绝的不合规 commit message）。
- 条件供给：MCP 接入后需要人工粘贴外部数据/手工建 PR 的次数是否下降；因权限/超时导致的会话中断次数（配合 `--analytics` 的用量与状态数据）。
- 任务匹配：同一任务用 Command 触发 vs 手写提示词的输出质量与返工次数差异。
- 效果验证本身：`--health-check` 在装前装后的差异；以及不要用 `--analytics` 的会话时长/工具调用数当成效指标——它只说明用得多。

**止损条件**：若某个组件装后一周内没有产生可指认的行为改变（自动执行、拦截、减少手工步骤中的任一），或 hook 脚本引入了不愿接受的写权限/外部调用，直接卸载并记录到「不适用」清单——这本身也是手册里「什么不该交给 AI」的素材。
