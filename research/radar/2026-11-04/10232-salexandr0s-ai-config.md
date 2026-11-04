# salexandr0s/ai-config

- 结论：**值得一试**。建议在隔离环境小范围试装，并先复核 Codex 的高权限默认值；它给出了可复制的安装、技能绑定、工作流和校验命令，但属于个人化 macOS 配置，且没有效果数据。
- 原文：https://github.com/salexandr0s/ai-config
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T12:21:56.661Z

## 是什么
ai-config 是面向 Claude Code 与 Codex 的版本化配置仓库，提供共享技能、8 个 agent 角色、工作流提示、hooks、设计标准、安装器和校验脚本。README 声称包含 78 个 bundled skills、2 个 assistant，以及 46 个 Claude bindings 和 74 个 Codex bindings；公共默认配置放在仓库，凭据、本地设置、个人上下文、记忆、会话等私有状态留在本地。

## 具体做法
1. **先做前提与安全复核（必须先做）**：README 说明这是 macOS-first，需要 Bash、Git、Python 3.11+；Node.js 18+ 用于 bundled writing tools 和 shadcn MCP；Claude Code、Codex 需另行安装，Bun 可选。安装前先读 `docs/configuration.md#public-defaults-and-private-state` 和 `docs/privacy.md`，确认能接受 README 明确写出的 Codex 默认值：`danger-full-access` 与 approval policy `never`。若不能接受，不要直接接入真实仓库、凭据或生产环境。
2. **默认安装**：在仓库目录执行安装器。README 说明默认会链接配置、skills、commands、workflows，不构建 browser daemon，也不启动后台任务；被替换的 tool-link 会备份，Codex 配置会合并、校验并重新生成，私有 overlay 会保留。
```sh
git clone https://github.com/salexandr0s/ai-config.git
cd ai-config
./install.sh
```
3. **按需启用可选组件**：需要浏览器守护进程时用 Bun 构建；需要在 macOS 上做每周 memory rotation 时启用 LaunchAgent。
```sh
./install.sh --with-browse
./install.sh --with-launchagent
```
4. **指定工作区位置**：如果工作区不在已有的 `~/GitHub`，用参数指定。
```sh
./install.sh --workspace "$HOME/Projects"
```
5. **把私有状态留在 Git 外**：README 给出的对应关系是：`claude/settings.json` 对应 `~/.claude/settings.local.json`；`codex/config.base.toml` 对应 `~/.config/codex/config.local.toml`；空白 `claude/user/` 模板对应 `~/.claude/USER/` 个人上下文。凭据、本地设置、可信项目路径、个人身份文件、memory、sessions、caches、session journals 都不要放进仓库。
6. **调用工作流**：在 Claude Code 中可直接使用 slash commands。
```text
/workflow-feature add a settings page
/workflow-bugfix investigate a failed save
/workflow-review-only review the authentication module
```
在 Codex CLI 中可直接调用已安装的 prompt templates。
```sh
codex '$config-editor audit the current configuration'
codex "Follow $HOME/.codex/workflows/feature.md to implement a settings page"
```
7. **安装后校验**：进入仓库后运行以下命令。`--installed` 只报告差异，不替换本地 skills。
```sh
python3 scripts/skills-inventory.py --check
python3 scripts/skills-inventory.py --installed
python3 -B scripts/verify-avoid-ai-writing.py
python3 -B -m unittest discover -s tests -v
```
8. **有意修改技能后的维护**：先审查来源与 notices，再刷新清单；然后重跑安装器刷新链接，私有 overlay 会保留。
```sh
python3 scripts/skills-inventory.py --refresh
./install.sh
```

## 对应的研究问题
- **能力发现**：README 把可交给 AI 的能力按技能和角色列出，覆盖设计、写作、安全、调试、Apple 平台、部署、项目维护，并点名了 `avoid-ai-writing`、`Stageshow`、`deepsec` 等技能；还提供 feature、bugfix、review 三类工作流。它能帮助发现“写作质量、产品演示、安全审查、部署维护”等可委托任务，但具体技能内容未在给出的原文中展开。
- **任务匹配**：它按 assistant 和角色做匹配：分离 Claude 与 Codex 的 bindings，提供 8 个 agent 角色用于规划、实现、评审和协调，并分别用 Claude slash commands 与 Codex prompt templates 承载工作流。原文没有给出按模型能力选型的标准，只能确认其“按工具、按角色、按工作流”匹配方式。
- **条件供给**：安装器负责链接配置、skills、commands、workflows；私有 overlay 承载本地设置和个人上下文；hooks wiring、workspace instructions、设计标准、可选 browser daemon 与 shadcn MCP 都属于需要供给的工具或信息条件。权限方面必须特别处理：README 明确说 Codex base 使用 `danger-full-access` 和 `never`，这是高权限默认值。
- **主动推进**：README 明确给出的自动机制只有 macOS 上的 `--with-launchagent` 每周 memory rotation；hooks 被列为配置能力，但材料没有给出触发条件、状态机或持续执行细节。因此只能确认“有周期性记忆轮转”，不能据此推断它能自动推进复杂工作。
- **效果验证**：校验集中在安装与配置完整性：skills inventory 检查、已安装差异报告、写作技能验证、hooks/配置/安装/技能打包的单元测试、Codex 配置合并校验、manifest 与 catalog 的哈希/来源一致性检查。它们能证明“装对了、没漂移”，但不能证明工作结果改善；原文没有案例、前后对比或效率指标。

## 与已有做法的关系
清单中有 **Claude Code（tool，已 adopt）**。ai-config 是 Claude Code 的配套配置与扩展：为 Claude Code 提供 skills、agents、commands、settings，同时把同一套共享能力适配到 Codex。它不是替代 Claude Code，而是叠加在现有助手之上的配置层。清单中没有 ai-config、Codex 或这些具体 skill 的条目。

## 证据与局限
原文是 GitHub README，不是完整文档；`docs/skills.md`、`docs/configuration.md`、`docs/privacy.md` 的具体内容未提供。可确认的证据主要是安装命令、目录结构、私有配置路径、工作流调用方式和校验命令；78 个技能、8 个角色、46/74 个 bindings 都是 README 自述，未附效果数据或案例。材料给出的外部信号只有 50 stars。

适用条件有限：macOS-first；会修改本机链接和配置；Codex 默认高权限；第三方技能保留各自许可证，`aside-browser` 因上游无再分发许可只保留在本地、不在仓库中分发。若直接用于真实项目，安全与隐私风险需要先评估。

## 怎么试、怎么验证
最小试用应在隔离的 macOS 用户或一次性环境中进行：先备份现有 `~/.claude` 与 `~/.config/codex`，读配置与隐私文档，再执行默认安装，暂不启用 `--with-browse` 和 `--with-launchagent`。先跑完四条校验命令，确认安装层无异常；再在一个低风险仓库用 `/workflow-review-only` 做一次代码审查，用 `/workflow-feature` 做一个小功能。

验证时设基线：同一任务用普通 Claude Code/Codex 会话或人工审查完成，对照记录完成时间、人工修改次数、返工轮次、测试通过情况、评审发现问题数与误报数、是否发生越权或隐私暴露、是否需要回滚。安装层以校验命令通过、私有 overlay 未进入 Git、Codex 权限符合预期为门槛；任务层至少要求结果不差于基线且有一项明确改善，才进入下一轮。若出现权限或隐私问题，立即停止并回退。
