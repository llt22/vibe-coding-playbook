# luongnv89/claude-howto

- 结论：**值得一试**。建议小范围试：先在单个项目复制 `/optimize`、项目 `CLAUDE.md` 和 `code-review-specialist` skill，再按需加 hooks/MCP；理由是 README 给出了可照抄的安装命令、hooks 配置和 CLI 用法，但模板正文与效果数据未在材料中展开，需先验证再推广。
- 原文：https://github.com/luongnv89/claude-howto
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T05:51:12.493Z

## 是什么
`luongnv89/claude-howto` 是一个 MIT 许可的 Claude Code 教程仓库，README 声称包含 10 个模块，覆盖 slash commands、memory、skills、subagents、MCP、hooks、plugins、checkpoints、advanced features 和 CLI，并提供可复制的配置/模板与 15 分钟、1 小时和 11–13 小时的学习路径。它的定位不是新工具，而是把 Claude Code 已有功能组合成工作流的教程层。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：已安装 Claude Code 2.1+；本地有一个项目目录；下面用 `/path/to/your-project` 代替实际路径；MCP 步骤需要相应凭据；hooks 脚本按 README 是 shell 脚本，需可执行权限。

1. 克隆指南仓库。
```bash
git clone https://github.com/luongnv89/claude-howto.git
cd claude-howto
```

2. 先复制一个 slash command 到项目，建立最小闭环。
```bash
mkdir -p /path/to/your-project/.claude/commands
cp 01-slash-commands/optimize.md /path/to/your-project/.claude/commands/
```
在 Claude Code 中输入：
```
/optimize
```

3. 放入项目记忆，让后续会话自动加载团队/项目规范。
```bash
cp 02-memory/project-CLAUDE.md /path/to/your-project/CLAUDE.md
```
需要目录级或个人级记忆时：
```bash
cp 02-memory/directory-api-CLAUDE.md /path/to/project/src/api/CLAUDE.md
cp 02-memory/personal-CLAUDE.md ~/.claude/CLAUDE.md
```

4. 安装一个可自动调用的 skill。
```bash
cp -r 03-skills/code-review-specialist ~/.claude/skills/
```
或装到项目内：
```bash
cp -r 03-skills/code-review-specialist /path/to/project/.claude/skills/
```

5. 安装 subagents。
```bash
cp 04-subagents/*.md /path/to/project/.claude/agents/
```

6. 配置 MCP（需要 GitHub PAT；数据库示例需要 `DATABASE_URL`）。
```bash
export DATABASE_URL="postgresql://..."
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer YOUR_GITHUB_PAT"
```
README 也允许手动写入项目 `.mcp.json`，示例在 `05-mcp/`。

7. 安装 hooks 并在 `~/.claude/settings.json` 注册。先复制脚本并赋权：
```bash
mkdir -p ~/.claude/hooks
cp 06-hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```
然后在 `~/.claude/settings.json` 加入 README 给出的配置：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/format-code.sh" },
          { "type": "command", "command": "~/.claude/hooks/security-scan.sh" }
        ]
      }
    ]
  }
}
```
这表示每次 Write 后自动格式化并做安全扫描。

8. 以本地插件目录方式加载成套流程（README 明确说仓库没有 marketplace，`/plugin install` 不适用）。
```bash
claude --plugin-dir ./07-plugins/pr-review
claude --plugin-dir ./07-plugins/devops-automation
claude --plugin-dir ./07-plugins/documentation
```

9. 用 checkpoints/rewind 做安全试验。Claude Code 中执行：
```
/rewind
```
然后按 README 的六个选项选择：恢复代码和对话、只恢复对话、只恢复代码、从此处总结、总结到此处、取消。

10. 用 headless/CLI 方式把 Claude Code 放进脚本或 CI。
```bash
claude -p "Run tests and generate report"
cat error.log | claude -p "explain this error"
claude -p --output-format json "list functions"
claude -r "feature-auth" "continue implementation"
```

11. 用内置自评和测验找差距。
```
/self-assessment
/lesson-quiz hooks
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. **能力发现**：README 列出的可直接交给 AI 的候选包括 `/optimize`（代码优化分析）、`/pr`（PR 准备）、`/generate-api-docs`（API 文档）；`code-review-specialist`、`brand-voice`、`doc-generator` 技能；`code-reviewer`、`test-engineer`、`documentation-writer`、`secure-reviewer`、`implementation-agent` 子代理；`format-code.sh`、`pre-commit.sh`、`security-scan.sh`、`log-bash.sh`、`validate-prompt.sh`、`notify-team.sh` 等 hooks。用例表还列出自动代码审查、团队 onboarding、CI/CD 自动化、文档生成、安全审计、DevOps 流水线、复杂重构。注意：README 只给了名称和用途，没有展开每个模板的完整提示词。

2. **任务匹配**：README 的 Feature Comparison 给出了按任务选形态的依据：一次性快捷用 slash commands；跨会话规范用 memory；需要自动触发的能力用 skills；需要隔离上下文和分工用 subagents；需要实时外部数据用 MCP；需要事件自动校验用 hooks；需要成套流程用 plugins；复杂实现先 Planning Mode；长任务用 Background Tasks；高风险试验用 checkpoints。模型方面只说所有模板兼容 Claude Fable 5.1、Claude Opus 5.5、Sonnet 5.5、Haiku 4.5 等列表，没有给出“某类任务该选哪个模型”的细分规则。

3. **条件供给**：需要提供安装环境（Claude Code 2.1+，README 推荐原生安装器/Homebrew/WinGet）；项目级、目录级或个人级 `CLAUDE.md`；`.claude/commands/`、`.claude/agents/`、`~/.claude/skills/`、`~/.claude/hooks/` 等目录；hooks 的 `settings.json` 注册和可执行权限；MCP 的环境变量与 PAT；插件用 `--plugin-dir` 指定；子代理需要工具权限和清晰描述（troubleshooting 明确提到检查工具权限、描述清晰度）。反馈条件包括 hooks 里的测试/扫描、`/lesson-quiz` 和 `/self-assessment`。权限模式包括 `manual`（配置值 `default`）、`acceptEdits`、`plan`、`auto`、`dontAsk`、`bypassPermissions`；安全审查子代理可用 read-only 模式。README 还提醒不要硬编码凭据、不要提交敏感数据。

4. **主动推进**：hooks 是明确的事件驱动机制，README 列出 5 种 hook 类型和 33 个事件、4 个类别，包括 `PreToolUse`、`PostToolUse`、`PostToolUseFailure`、`SessionStart`、`Stop`、`TaskCompleted`、`TaskCreated`、`FileChanged`、`PreCompact`、`PostCompact`、`PreModelSwitch`、`Notification` 等，可按事件或状态自动执行命令/HTTP/prompt/mcp_tool/agent。Background Tasks 用于长运行操作，Headless Mode 可用于 CI/CD（`claude -p ...`），Checkpoints 默认随用户提示自动创建。README 没有给出按时间触发的具体配置示例，时间触发只能算未展开。

5. **效果验证**：可用的验证机制是 `/self-assessment` 找知识缺口、`/lesson-quiz [topic]` 做课后测验；hooks 中 `pre-commit.sh` 可在提交前跑测试、`security-scan.sh` 做安全扫描、`format-code.sh` 做格式化，能作为过程门禁；checkpoints 可用来比较不同实现方案。README 没有给用户侧的生产力、缺陷率或 ROI 数据；仓库自身的 pytest、ruff、bandit、mypy、coverage 测试是维护该指南脚本的测试，不是使用该指南后工作改善的证据。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中已有 **Claude Code**，状态为 **adopt**。本仓库不是替代 Claude Code 的新工具，而是 Claude Code 的教程/模板层，覆盖其 slash commands、memory、skills、subagents、MCP、hooks、plugins、checkpoints、CLI 等功能，并明确说与官方文档互补。对已经采用 Claude Code 的团队，它可作为把单点功能组合成工作流的参考；但采用它不等于采用新的基础工具。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
原文给出的硬信息：MIT 许可；版本标注 v2.1.302，兼容 Claude Code 2.1+；10 个模块；完整学习路径 11–13 小时；15 分钟可完成第一个 slash command；1 小时 essential setup；hooks 有 5 种类型、33 个事件；GitHub 指标为 43,460 stars、今日 177 stars；列出多个示例工作流和目录结构。原文也给出了具体安装命令、hooks JSON 配置、MCP 命令和 CLI 示例，这是可试的基础。

局限：我们读到的是 README，不是各模块正文；`optimize.md`、`code-review-specialist/SKILL.md`、`pre-commit.sh` 等模板内容没有在材料中展开，无法判断其提示词和脚本质量。README 中的“90% 的能力没用上”“10x productivity”“production-ready templates”“Trusted by Developers”属于作者主张，没有基准测试、前后对比或客户案例数据。示例工作流只是流程描述，没有实际输出和失败率。适用条件主要是使用 Claude Code 2.1+ 的代码项目；hooks 依赖 shell 和本地权限；MCP 依赖外部凭据和网络；README 标注时间为 2026 年 10 月，且末尾模型列表被截断，实际使用前应核对当前 Claude Code 版本、hook 事件和模型兼容性。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
建议先做两周、单项目的最小试用，不要一次性全装：

1. 选一个真实代码仓库，记录基线：3 类任务（代码审查、PR 准备、API 文档）各做 3 次，记录耗时、返工次数、审查发现的有效问题数/误报数、测试通过率。
2. 只装三样：`optimize.md` slash command、`project-CLAUDE.md`、`code-review-specialist` skill；用 `/optimize` 和代码审查任务跑 5 次真实工作。
3. 再加一个低风险 hook：先只启用 `format-code.sh`，确认不会破坏文件；再加 `security-scan.sh`，记录每次扫描耗时和新增问题数。
4. 用 `/rewind` 对同一任务比较“AI 辅助方案”和“人工方案”，保留代码和对话快照。
5. 如涉及外部系统，再单独试 MCP；没有明确数据需求时不要先上 MCP。

判断改善的指标：
- 时间：从任务开始到可提交 PR 的分钟数是否下降；返工次数是否下降。
- 质量：代码审查有效问题数是否增加、误报是否可控；测试通过率是否不降；安全扫描新增问题是否被及时处理；文档缺失项是否减少。
- 采用行为：每周实际调用次数、AI 建议被采纳比例、hook 失败率。
- 风险：是否出现误格式化、敏感信息进入提示词/仓库、MCP 凭据泄露；这些应为 0 或可回滚。
- 决策规则：连续 2–4 周，时间下降且质量指标不下降，才扩大到团队；若只有调用次数上升但返工/误报上升，则退回只保留 slash command 和 memory。
