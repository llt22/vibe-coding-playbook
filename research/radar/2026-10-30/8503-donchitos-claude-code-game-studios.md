# Donchitos/Claude-Code-Game-Studios

- 结论：**值得一试**。建议把它当作“多角色 + 工作流 + 事件钩子 + 可调严谨度”的复杂项目协作模板，在单个小型项目上试跑，不要直接整仓照搬到非游戏工作；因为 README 给出了可执行的安装、配置和校验流程，但效果证据主要是作者自测，且强依赖游戏开发场景。
- 原文：https://github.com/Donchitos/Claude-Code-Game-Studios
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T05:51:53.718Z

## 是什么

这是一个面向 Claude Code 的 MIT 模板仓库，目标是把单次 Claude Code 会话组织成“游戏工作室”：仓库 README 声称包含 49 个代理、74 个 skills、15 个 hooks、14 条路径规则和 62 个文档模板。代理分三层：导演层（创意总监、技术总监、制作人）、部门主管层（游戏设计、主程、美术、音频、叙事、QA、发布等）、专家层（玩法程序、引擎程序、AI 程序、网络程序、系统设计、关卡设计、技术美术、UX、性能分析、DevOps、安全、QA 测试等）。

它不是自动驾驶员。README 明确写了协作协议：代理先提问，再给 2–4 个带优劣的选项，由用户决定，然后出草稿，最后经用户批准才落盘。代理协调遵循纵向委派、同层咨询、冲突升级到共同上级、跨部门变更由制作人协调、不得越域改文件等规则。

README 还给出了一个关键的成本/效果观察：同一个 brief 用不同 `modes.rigor` 构建四款游戏，表格展示 `minimal` 在写第一行游戏代码前只有 1 份文档、耗时 0 分钟；`standard` 有 30 份文档、耗时 58 分钟；两者都产出了可运行且测试过的游戏，但两名盲审和一次真人试玩把 `standard` 版本排在最后。作者据此认为多出的 29 份文档买到的是可追溯性，不是更好的游戏。

## 具体做法

1. **准备环境。** 前提：安装 Git、Claude Code、Python 3 和 Bash；推荐安装 `jq`。README 特别说明 Python 3 是硬前提：每个 skill 和 hook 都要读 `project.yaml`，没有 Python 时所有设置会静默回退到默认值；提交暂存了数据 JSON 时，没有 Python 校验会被阻止。Bash 用于运行 hooks，Windows 上由 Git for Windows 提供。

```bash
git clone https://github.com/Donchitos/Claude-Code-Game-Studios.git my-game
cd my-game
```

2. **必须在项目根目录启动 Claude Code。** 前提：当前目录包含 `CLAUDE.md` 和 `project.yaml`。不要在 `src/` 等子目录启动，否则会跳过项目 hooks、deny 规则和 ask-first 权限模式。

```bash
claude
```

3. **用 `/start` 做入口。** 它会询问你当前处于什么阶段（完全没想法、模糊概念、清晰设计、已有工作），再引导到合适工作流。README 说它不做假设。已知需求时也可以直接跳转：

```text
/start
```

```text
/brainstorm
/setup-engine godot 4.7
/project-stage-detect
```

4. **配置 `project.yaml` 的严谨度。** 它是工作室行为的单一事实源，控制引擎、命名约定和 `modes` 块。最重要的设置是 `modes.rigor`：`minimal`、`standard`、`full`。它是一次入口覆盖六个开关：`workflow`（要求哪些 GDD 章节）、`docs.density`、`qa.level`、`story_granularity`、`review_mode`（多少导演代理参与评审）、`team.size`。默认是 `minimal`。需要更严格时再升档。

```text
/settings
/settings modes.review_mode
/settings modes.rigor=full
/settings --local modes.review_mode=solo
```

前提与边界：`/settings` 可查看或写配置；写 `project.yaml` 是团队级，`--local` 写 `project.local.yaml` 是个人级。`review_mode` 和 `team.size` 可个人覆盖；`modes.automation` 也在严谨度之外，可个人覆盖。`system_overrides` 可让单个系统高于项目标准，`testing.strict` 可按测试类型决定缺失证据是阻止还是警告。

5. **先跑最小闭环，再按需加流程。** `minimal` 的推荐链路是：`/start` → `/setup-engine` → `/brainstorm`（一页 brief）→ `/create-stories` → `/dev-story` ↔ `/story-done`。项目变大后再加 `/create-epics`、`/sprint-plan`、`/design-review`、`/code-review`、`/qa-plan`、`/gate-check` 等。

```text
/start
/setup-engine
/brainstorm
/create-stories
/dev-story
/story-done
```

6. **用角色分层和团队技能组织协作。** 代理分导演、主管、专家三层，按纵向委派和横向咨询工作。需要多个代理共同做一个功能时，使用团队编排 skills，例如：

```text
/team-combat
/team-narrative
/team-ui
/team-release
/team-polish
/team-audio
/team-level
/team-live-ops
/team-qa
```

前提：把代理层级理解为角色资历，不是计费方案。README 说三个导演代理在 frontmatter 中要求 Opus，`lead-programmer` 和十五个专家指定 Sonnet，其余三十个继承当前会话模型。

7. **保留默认 hooks 和权限规则。** hooks 会在会话和工具调用事件上自动运行：`validate-commit.sh` 在提交前检查硬编码值、TODO 格式、JSON 有效性和设计文档章节；`validate-push.sh` 对受保护分支推送、打 tag、merge、发布等给出警告；`validate-read.sh` 拒绝整文件读取超过 40 KB 的设计文档，并返回标题让重试只读一节；`validate-write.sh` 只警告不阻止；`validate-assets.sh` 检查数据 JSON 和资源命名；`detect-gaps.sh` 在会话开始时发现新项目缺设计文档；`log-agent.sh` 和 `log-agent-stop.sh` 记录子代理审计轨迹；`validate-agent-artifact.sh` 在子代理停止但没写简报指定文件时警告。

前提与注意：这些 hook 会在每次 Bash、PowerShell、Read、Write、Edit 调用时触发，但无关时会立即退出。`settings.json` 的权限规则自动允许测试运行，阻止 force push、`rm -rf`、读取 `.env` 等危险操作。README 还提醒：git 规则会在命令文本中匹配 `push` 后跟 ` +` 或 ` -f`、`clean` 后跟 ` -f`、`reset` 后跟 `--hard`，连提交信息里出现类似片段也可能被拒绝，需要改写提交信息。

8. **用证据门槛关闭故事。** 任何改变玩家可见内容的故事，不能只靠测试通过就关闭。必须启动游戏、观察、截图并保存到 `production/qa/evidence/`。README 明确说：解析检查不等于运行。这个要求在所有严谨度档位都成立，包括 `minimal`；`minimal` 可以豁免自动测试，但不能豁免“看一眼”。

9. **修改模板后用 `studio-tests` 验证框架本身。** 前提：这是测试 skills 和 agents 的框架，不是测试你的游戏；游戏测试放在 `tests/`。

```text
/skill-test static [name]
/skill-test category [name]
/skill-test spec [name]
/skill-test audit
/skill-improve [name]
```

`/skill-test static` 做 7 项结构合规检查；`category` 做分类质量 rubric；`spec` 做行为规格断言；`audit` 做覆盖报告；`/skill-improve` 走测试—修复—复测循环，并按分数变化决定保留还是回退。

## 对应的研究问题

- **能力发现：** 仓库把“可以交给 AI 的工作”从单次问答扩展为多角色分工：设计脑暴、系统设计、GDD 评审、架构决策、故事拆分、开发实现、代码评审、平衡检查、内容审计、性能分析、技术债、安全审计、QA 计划、冒烟/浸泡/回归测试、发布清单、补丁说明、本地化、原型和垂直切片等。74 个 skills 本身就是一份可探索的任务清单。
- **任务匹配：** 角色层级、引擎专家集（Godot、Unity、Unreal）、路径规则和 skills 都按任务领域拆分；模型也在 agent frontmatter 中声明：导演用 Opus，主程和部分专家用 Sonnet，其余继承会话模型。`review_mode`、`team.size`、`modes.rigor` 则控制协作强度和评审人数。
- **条件供给：** 需要项目根目录、`CLAUDE.md`、`project.yaml`、Python/Bash/jq、`settings.json` 权限、路径规则、文档模板和 hooks 反馈。README 还说明：在子目录启动会丢失 hooks、deny 规则和 ask-first 权限模式，这是典型的“条件供给不完整导致效果下降”。
- **主动推进：** 有明确的事件/状态触发：会话开始检测项目阶段和缺失文档，提交/推送前校验，读取大文档时限制整文件读取，代理启动/停止时记录审计，代理停止时检查是否漏写产物，响应结束时归档 `active.md` 并记录 git 活动，权限提示或空闲约一分钟时发通知。但作者明确说这不是自动驾驶；`guided`、`autonomous` 和 Claude Code 自带 auto 模式会用速度换掉部分询问，具体路由在 README 中未展开。
- **效果验证：** 有三层验证：游戏测试在 `tests/`；框架质量用 `studio-tests` 和 `/skill-test`、`/skill-improve`；交付质量用 `/gate-check`、`/test-evidence-review`、QA 截图证据和“必须运行并观察”的关闭条件。README 还给出文档数、耗时、盲审和真人试玩排名这类结果指标，但只是作者自测。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）：** 本仓库是构建在 Claude Code 之上的模板，使用 `.claude/agents`、`.claude/skills`、`.claude/hooks`、`.claude/rules`、`CLAUDE.md`、`settings.json` 和 slash commands。它不是替代 Claude Code，而是把 Claude Code 的项目级配置、子代理、技能和钩子组织成一套复杂项目工作流。
- **Unreal Agent（清单状态：study）：** 本仓库包含 Unreal Engine 5 的专家代理集，README 列出 `unreal-specialist` 及 GAS、Blueprints、Replication、UMG/CommonUI 子专家。它与清单中的 Unreal Agent 可能有交集，但原文没有说明二者是同一实现或有何关系，不能直接等同；可作为 Unreal 场景的对照材料。
- 清单中没有其他直接相关条目。

## 证据与局限

- **有具体可执行内容：** 安装命令、根目录启动要求、`/start`、`/settings`、最小工作流、团队编排 skills、hooks 触发条件、`/skill-test` 命令和 QA 截图要求都来自 README，属于可照做的流程。
- **效果证据主要是作者自述：** README 报告了 `minimal` 与 `standard` 的文档数、耗时和盲审/试玩排名，但没有附样例游戏、原始评分表、盲审流程细节或外部复现。它说“四款游戏”但表格只展示了两档，另外两档无法核对。
- **核心结论有适用条件：** “`minimal` 默认更好”来自游戏开发场景下的一次内部比较，不能直接推到所有复杂项目；README 自己也说项目变大时再用 `/settings` 升档。
- **强游戏领域绑定：** 代理、规则、模板、引擎专家和 QA 证据都围绕游戏开发。README 说模板可定制：删改代理、编辑提示词、修改 skills、增加 rules、调整 hooks、选择引擎代理集；但没有给出迁移到非游戏项目的具体步骤。
- **平台与工具限制：** 主开发环境是 Windows 10 + Git Bash，hooks 也在 macOS 和 Linux 测试；`notify.sh` 在非 Windows 上是 no-op。Python 缺失会让设置静默回退，提交数据 JSON 时会被阻止。
- **未审阅源码：** 上述判断只依据仓库 README，没有实际运行 hooks、agents 或 skills，也没有核对 49/74/15/14/62 这些计数与代码是否一致。

## 怎么试、怎么验证

1. **选一个 1–2 天能完成、但确实需要多角色协作的小任务。** 优先选游戏原型或可运行的小型软件功能，不要一上来就迁移整个非游戏业务。建独立仓库或分支，保留原始模板便于回退。
2. **先跑 `minimal` 闭环。** 按前提装好 Git、Claude Code、Python 3、Bash 和可选 `jq`，在根目录启动，执行 `/start`，走 `/setup-engine` → `/brainstorm` → `/create-stories` → `/dev-story` ↔ `/story-done`。只做一个功能，不启用团队编排。
3. **建立基线。** 同一任务用普通 Claude Code 会话（不装模板）做一次，记录：首次可运行产物时间、人工纠正次数、返工次数、问题在哪个阶段被发现、产生文档数、最终评审意见。
4. **再跑一次 `standard` 做对照。** 同一 brief 下把 `modes.rigor` 调到 `standard`，观察多出的文档和评审是否真的减少返工或漏检。不要用虚构阈值；以基线为对照，看改善是否值得额外时间。
5. **检查机制是否真的工作。** 查看 hooks 是否在提交前发现硬编码、TODO、JSON 或设计文档问题；查看 `log-agent` 是否留下代理审计；查看 `validate-agent-artifact` 是否抓到漏写产物；查看 `production/qa/evidence/` 是否有截图。修改 skill 后运行 `/skill-test audit` 和 `/skill-improve [name]`。
6. **判断是否继续。** 如果相对基线，返工或漏检明显减少，且首次可运行产物时间没有不可接受地变差，就可以扩大到一个真实项目；如果只是文档变多、评审变重但结果没改善，就保留 `minimal` 或只借鉴 hooks、路径规则和证据门槛。若在非游戏项目上无法低成本改造代理和规则，则降级为 study，不进入手册的 adopt/try 流程。
