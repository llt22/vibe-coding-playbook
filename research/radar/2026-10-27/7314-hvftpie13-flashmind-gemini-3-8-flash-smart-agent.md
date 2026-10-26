# Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent

- 结论：**值得一试**。先在一个仓库、一个 MCP 客户端上照着 README 接线（npx 启动的 MCP 配置、规则文件、verify-before-done 单个技能），小范围试用两周，再用「未跑测试就说已修复」和「虚构包名或函数」两类事件计数判断去留；理由是原文提供了可直接照抄的安装命令、MCP JSON 和客户端配置映射，但没有给出任何效果数据，且防幻觉规则正文与四个技能正文均未提供，只能复用其接线方式。
- 原文：https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T19:56:36.214Z

## 是什么

flashmind 是一个面向编码智能体的打包插件（npm 包 `flashmind`，MIT，仓库 31 stars），宣称把三层能力一次性装进 Gemini CLI / Antigravity / Cursor / VS Code(Copilot) / Windsurf / Claude Code 等客户端：

1. **跨工具共享记忆**：通过第三方 MCP 服务 Engram，任务开始时自动回忆历史 bug 与架构决策，任务结束前保存新经验，并在信任旧记忆前用 `mem_review` 对照当前代码复核。所有编辑器共用一个本地数据库（`~/.engram/` 或 `~/.flashmind/`）。
2. **防幻觉规则**：写入 `GEMINI.md` / `AGENTS.md`（Claude Code 下落到 `CLAUDE.md`），要求引用代码证据、区分事实与假设、承认未知。
3. **主动技能（Agent Skills）**：4 个按需加载的分步操作手册——`plan-first`、`no-invented-code`、`systematic-debugging`、`verify-before-done`，各自有明确触发条件。

另附 Gemini CLI 的斜杠命令（`/memory:recall`、`/memory:save`、`/memory:forget`、`/memory:summary`、`/verify`）与各客户端预置配置文件。

## 具体做法

前提：Node ≥ 18；已安装目标客户端（至少支持 MCP）；Windows 下用 PowerShell 版本命令。以下命令与配置均取自原文，可直接复制。

1. **（最轻）只接 MCP 服务**：在客户端的 MCP 配置（`mcp.json` / `mcp_config.json`）中加入：

```json
{
  "mcpServers": {
    "flashmind": {
      "command": "npx",
      "args": ["-y", "flashmind"]
    }
  }
}
```

2. **（Gemini CLI 用户）装扩展**：

```bash
gemini extensions install https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent
gemini -m gemini-3.8-flash
```

3. **（要记忆 + 技能 + 规则全套）跑自动安装器**，前提：本机有 git，且能安装 Engram 二进制。

macOS / Linux：
```bash
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
./install.sh antigravity-cli
```

Windows（PowerShell）：
```powershell
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
.\install.ps1 antigravity-cli
```

4. **按客户端手工放置配置文件**（原文 `configs/` 目录给出对应关系）：

| 客户端 | MCP 配置文件 | 规则文件位置 |
|---|---|---|
| Antigravity | `configs/antigravity/mcp_config.json` → `~/.gemini/config/mcp_config.json` | `AGENTS.md` → `~/.gemini/GEMINI.md` |
| Cursor | `configs/cursor/mcp.json` → `~/.cursor/mcp.json` | `configs/cursor/flashmind.mdc` → `~/.cursor/rules/` |
| VS Code (Copilot) | `configs/vscode/mcp.json` → `.vscode/mcp.json` | `configs/vscode/flashmind.instructions.md` |
| Windsurf | `configs/windsurf/mcp_config.json` → `~/.codeium/windsurf/mcp_config.json` | `configs/windsurf/global_rules.md` |
| Claude Code | 执行 `bash configs/claude-code.sh` | `AGENTS.md` → `CLAUDE.md` |
| 任意 MCP 客户端 | `configs/mcp.json` | `AGENTS.md` |

5. **靠触发条件让技能自动加载**（不需要手动调用，前提是技能目录只有一份副本）：

| 技能 | 触发条件 | 用途 |
|---|---|---|
| `plan-first` | 任务 ≥3 步或多文件改动 | 读代码 → 写计划 → 一次执行一个已验证的步骤 |
| `no-invented-code` | 写新函数或 import | 对照本地源码核实符号与已安装版本 |
| `systematic-debugging` | 报错、测试失败、崩溃 | 查历史记忆 → 复现 → 定根因 → 最小修复 → 证明有效 |
| `verify-before-done` | 宣布 "fixed" / "done" 之前 | 跑 linter / 测试并报告确切的终端结果 |

6. **用斜杠命令做记忆与审计**（Gemini CLI）：`/memory:recall <query>` 检索并总结记忆；`/memory:save <fact>` 保存已验证的决策或发现；`/memory:forget <item>` 删除过时记忆；`/memory:summary` 生成并记录会话摘要；`/verify` 对最后一条回答逐条核对来源证据。

7. **更新时只替换、不追加**（前提：先确认只保留一份配置与一份技能副本）：
- 一个服务一个条目：MCP 配置里只保留一个 `"flashmind"` 和一个 `"engram"` 键，改现有条目而不是粘贴第二份。
- 规则文件整体覆盖；对 `~/.gemini/GEMINI.md`、`CLAUDE.md` 这类共享文件，用标记包裹后每次只替换标记之间内容：

```
<!-- flashmind:start -->
...contents of AGENTS.md...
<!-- flashmind:end -->
```

- 技能只留一份：若曾把 `skills/` 复制到 `~/.gemini/skills` 和 `~/.agents/skills` 两处，删掉一处。
- 更新后开新会话，让 agent 重新加载规则与技能。
- 各安装方式对应的更新命令：扩展 `gemini extensions update flashmind`；NPX 重启编辑器（必要时 `npm cache clean --force`）；git clone 方式 `git pull` 后重跑安装脚本；Engram 用 `brew upgrade engram` 或 `go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest`。

## 对应的研究问题

- **能力发现**：把三类原本靠人盯的工作交给 agent——会话开始时回忆历史决策、写代码前核对符号与版本、宣布完成前跑测试并给出终端输出；`/memory:summary` 和 `/verify` 进一步把「会议纪要」和「逐条查证」变成一条命令。
- **任务匹配**：按任务形态选技能——多步/多文件→`plan-first`，新增函数或 import→`no-invented-code`，报错/测试失败→`systematic-debugging`，收尾→`verify-before-done`；按客户端选配置文件与规则落点（Cursor 用 `.mdc`、VS Code 用 `.instructions.md`、Claude Code 用 `CLAUDE.md`）。
- **条件供给**：需要提供 MCP 服务器配置、规则文件的正确路径、技能目录唯一副本、可写的本地记忆库（`~/.engram/`、`~/.flashmind/`）、以及更新的「替换而非追加」纪律；隐私上要求本地存储、零遥测、自动拒绝密码/bearer token/API key 等凭据。
- **主动推进**：技能由提示内容相关性自动触发，且触发条件被写死（如「≥3 步」「写新 import」「测试失败」「宣布完成前」）；记忆在任务开始自动召回、关闭前自动保存、并在信任前用 `mem_review` 对照当前代码复核——属于状态/事件触发而非人工点名。
- **效果验证**：`/verify` 要求逐条给出来源证据；`verify-before-done` 要求跑 linter/测试并报告确切终端结果。这是「验证方式」，但原文没有给出验证后的量化结果。

## 与已有做法的关系

清单中有相关条目：
- **Agent skills（concept，adopt）**：本仓库是该概念的一个具体落地包，把技能写成 4 个带触发条件的分步 playbook，并配套 `install.sh` / `install.ps1` 自动分发。
- **Claude Code（tool，adopt）**：原文给出专门接线方式（`bash configs/claude-code.sh`，`AGENTS.md` → `CLAUDE.md`）。
- **Cursor（tool，watch）**：原文给出 `configs/cursor/mcp.json` → `~/.cursor/mcp.json` 与 `flashmind.mdc` → `~/.cursor/rules/`。

未提及清单中其他条目。

## 证据与局限

原文提供的可核对信息：可直接复制的安装命令与 MCP JSON、六种客户端的配置映射表、技能触发条件表、更新与去重规则、隐私承诺（100% 本地、零遥测、自动拒绝密钥、0 运行时 npm 依赖）、徽章显示存在 CI test workflow、Node ≥18、MIT 许可、仓库 31 stars。

属于作者主张、原文未提供支撑的：「消除幻觉」「让快模型记得住、会规划、会验证」；没有任何基准、案例、前后对比数据或用户反馈。

关键缺失（影响可复制性）：防幻觉规则的实际正文（`AGENTS.md` / `GEMINI.md` 内容）和 4 个 `SKILL.md` 的正文都没有出现在抓取到的文本里，只有名称、触发条件和一句话用途——因此能照抄的是「接线方式」，抄不到「规则与技能的具体措辞」。另外 Engram 是另一个仓库的第三方组件；`gemini -m gemini-3.8-flash` 里的模型名与标题中的版本号无法从材料中核实。

适用条件：Node ≥18；客户端支持 MCP；团队愿意长期维护规则文件与记忆库；对「记忆污染」（存进未经核实的结论）有意识并愿意清理。

## 怎么试、怎么验证

最小试用（约两周）：选一个真实仓库、只选一个客户端（Gemini CLI 或 Claude Code），只装 MCP 记忆 + 规则文件 + `verify-before-done` 一个技能，暂不启用其余三个技能，避免多变量混淆。用 git 分支或独立 worktree 隔离，记录试用前的基线。

建议采集的指标（都能从会话记录、git 历史、终端输出里数出来）：
- 「未跑测试/linter 就宣布已修复」的次数：用 `/verify` 抽查 + 人工看 diff 与终端记录。
- 「引入不存在的包/函数/CLI 参数」的次数：靠依赖清单 diff 与 import 静态检查统计。
- 同一架构问题被重复提问的次数（记忆是否真的省了重复沟通）。
- 任务平均来回轮次与人工返工时长。
- 记忆库健康度：`/memory:recall` 命中里过期或错误条目的比例，以及 `mem_review` 纠错次数。
- 测试通过率与回归数量。

判断改善：与试用前同仓库、同类型任务对照；若前两类「幻觉类事件」明显下降、返工时长下降且测试通过率不降，则保留并再扩到第二个技能/第二个客户端；若记忆库积累脏条目反而误导（表现为引用过时决策、`mem_review` 频繁报错），则收缩为只保存经 `/verify` 确认的决策，或退回只装规则 + `verify-before-done`。
