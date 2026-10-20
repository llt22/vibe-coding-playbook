# ymatrix1/vantage

- 结论：**值得一试**。建议在一个以 Claude Code + git 为主的小仓库试用 Vantage，先 dry-run 安装，再用 Stop gate 和 stats 检验“只有证据才推进”的验收流程；它给出了可照做的安装与配置，但仍是 Phase 1、未发布、只覆盖 Asked/Built/Proven，不能当作完整交付验收系统。
- 原文：https://github.com/ymatrix1/vantage
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T04:11:19.445Z

## 是什么
Vantage 是一个本地运行的工作项状态跟踪工具。它读取 Claude Code hooks 和 git 留下的痕迹，把每项工作画成一行，并按 A2V 轨道推进：`Asked → Built → Proven → Reviewed → Shipped → Verified`。README 强调：只有证据能让卡片前进，例如最后一次编辑之后运行过的测试；智能体“说”什么不会让卡片前进。

当前 Phase 1 只对 Claude Code 和 git 建好可用切片：hook 采集到本地 spool、SQLite 存储、git 扫描、linker、Asked/Built/Proven 阶段机、warn 模式的 Stop gate、终端状态行、本地 Track 页面、单进程 daemon 和安装器。Reviewed、Shipped、Verified 还需要后续阶段的数据源。README 明确说还没有发布 release，也还没有按日使用满一周。

## 具体做法
1. 确认前提：Node.js 22.5 或更新版本、git、Claude Code；如果从 checkout 构建，还需要 pnpm。README 说明当前没有 published release，所以安装 release 的路径暂时不可用，只能走 checkout。

2. 推荐让 Claude Code 按安装指南安装。在要跟踪的仓库中打开 Claude Code，粘贴：
```text
Install Vantage for this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: check the prerequisites, get Vantage if it is not already on this machine (from a release, or a checkout build), show me the dry run first and wait for my OK, then install, start it, verify with vantage doctor, and tell me what changed and how to undo it.
```
前提：安装代理会先展示 `vantage add --dry-run` 的结果并等待你确认；确认后才会写 Claude Code 的 `settings.json`，并保留备份。

3. 也可以手工从 checkout 安装和构建：
```bash
git clone https://github.com/ymatrix1/vantage.git
cd vantage
pnpm install
pnpm build
```
在 npm 包发布前，用 node 运行 CLI，并设置一个短别名：
```bash
alias vantage='node /path/to/vantage/packages/cli/dist/src/main.js'
```

4. 在要跟踪的仓库里按顺序执行：
```bash
vantage add --dry-run
vantage add --yes
vantage start
vantage doctor
vantage open
```
每步作用：`--dry-run` 只打印会改动的文件，不写入；`--yes` 备份 `settings.json`、添加 hooks、注册仓库；`start` 运行 daemon；`doctor` 输出 PASS/WARN/FAIL 和修复提示；`open` 打开本地 Track 页面。条目大约在 daemon 下一轮扫描后出现，README 说约 30 秒。

5. 可选安装 Claude Code 插件，在对话里使用命令：
```text
claude plugin install vantage@vantage
```
然后在新会话中使用 `/vantage:open`、`/vantage:start`、`/vantage:doctor`、`/vantage:status`、`/vantage:add`。

6. 如需关闭或调整 Stop gate：默认是 warn 模式，只在智能体编辑代码后停止且没有新的测试或数据检查时提示，不阻塞。可用环境变量或配置调整：
```bash
VANTAGE_GATE_MODE=off
```
或在 `~/.vantage/config.toml` 中设置：
```toml
proof_gate = "off"
```
README 也列出可选值 `off|warn`。

7. 用 stats 查看可量化状态：
```bash
vantage stats
vantage stats --days 7
vantage stats --since 7d
vantage stats --repo myrepo
vantage stats --json
```
输出包括：工作项总数和活跃数、可读标题与 fallback 行、anchor 类型、session lineage、Needs you 数量及按 flag 分类、阶段分布、有多少编辑过的条目达到 Proven、有多少 Built 条目失去 proof、运行了哪些检查、事件来源和每日事件、数据库大小、最后一次阶段扫描时间。输出只含数字和固定标签，不含标题、命令、路径或仓库名，便于贴到 issue。

8. 可选启用 Haiku 分类，只改善标题、主题和分组，不决定状态、阶段或 proof。先 dry-run，再后台运行，再预览确认：
```bash
vantage classify --dry-run
vantage classify
vantage classify accept
vantage classify accept --all
vantage classify undo
```
启用前在 `~/.vantage/config.toml` 中设置：
```toml
[engines.classify]
enabled = true
[data_policy]
outside_calls = true
[data_policy.allow]
transcripts = true
```
README 说明每项只发送仓库名、分支、第一条请求的第一句（最多 300 字符，移除 URL 和疑似秘密文本）、最多 10 个文件名（不含路径）、计数和当前标题；不发送命令、transcript 或路径。默认关闭。

9. 需要撤销时：
```bash
vantage remove
vantage uninstall
```
`remove` 停止跟踪当前仓库，`uninstall` 移除 Vantage 写入 `settings.json` 的 hooks 和状态行；两者都不删除 `~/.vantage`，需要手动删除该目录才会清除数据。

## 对应的研究问题
1. 能力发现：Vantage 本身不发现新的 AI 能力，但它能把“智能体改了文件但没有跑测试”这类缺口显性化，让人看到还有哪些验证工作没有被交给 AI 或自动化。依据是 README 的 Built/Proven 区分和 Stop gate。
2. 任务匹配：目前明确匹配 Claude Code + git 的工作流；可选 classify 使用你已有的 Claude Code 和 Haiku 做标题/主题建议。README 没有比较不同模型或不同 agent 的适配性，不能据此推导通用模型选择。
3. 条件供给：需要 Node.js、git、Claude Code、pnpm（checkout 构建时）、本地 daemon、仓库注册、对 Claude Code `settings.json` 的写入权限和 hooks。数据默认本地存放在 `~/.vantage`；Track 页面只监听 `127.0.0.1`，带 token 和 Host/Origin 检查。
4. 主动推进：由 Claude Code hooks 和 git 事件触发更新，daemon 约 30 秒后让条目出现；Stop gate 在智能体停止后触发提醒；状态行和 Track 页面持续展示当前状态。README 没有给出更复杂的定时或跨系统事件编排。
5. 效果验证：这是 Vantage 的核心。阶段只按证据推进，proof 要求是最后一次编辑之后运行测试或数据检查；stats 直接报告“编辑过的条目有多少达到 Proven”“多少 Built 条目失去 proof”“运行了哪些检查”“Needs you 数量”。README 还提到 proof 规格包含 proof 类型、强度、新鲜度、fake proof detection 和 gate。

## 与已有做法的关系
清单中相关条目是 Claude Code（adopt）和 Cursor（watch）。Vantage 直接集成 Claude Code：安装 hooks、可选插件、读取 Claude Code 的会话和工具事件，因此它是对 Claude Code 工作流的补充，不是替代。README 没有提到 Cursor 集成，不能把 Vantage 用于 Cursor 的依据写入手册。清单中没有其他直接相关条目。

## 证据与局限
证据来自仓库 README：有明确安装命令、配置、插件命令、stats 输出说明、撤销方式，以及 CI 在 Windows 和 Ubuntu 上测试过的说明。它还明确描述了 Phase 1 的范围和未完成部分。

局限也很明确：README 自称 Phase 1，尚未按日使用满一周，没有 published release，当前只能 checkout 构建；Reviewed、Shipped、Verified 还没有数据源；只有 Claude Code 和 git 的完整切片。README 没有给出独立基准、对照实验或长期使用数据，因此“证据驱动能改善结果”目前主要是作者的方法主张和产品设计，不是外部验证结论。适用条件是单机、本地、以 Claude Code 为主、用 git 管理、愿意安装 hooks 的团队或个人。

## 怎么试、怎么验证
最小试用：选一个真实小仓库、一个开发者，先跑 `vantage add --dry-run` 检查会改哪些文件，再安装并运行 1 到 2 周。只启用默认功能，先不要开 classify；明确记录安装前的基线工作方式，作为对照。

每周看这些指标：
```bash
vantage stats --days 7
vantage stats --since 7d
vantage stats --json
```
重点看：编辑过的条目中达到 Proven 的比例是否上升；Built 条目失去 proof 的数量是否下降；Needs you 总数和最近 48 小时数量是否可接受；Stop gate 提示中有多少是误报；运行检查的数量和类型是否增加。再人工抽查 10 条 Track 记录，对照 git diff、测试日志和 PR，确认阶段推进确实有证据，而不是智能体自述。

判断改善的标准由团队自定，可把 README 中 stats 的 ✅/⚠️/❌ 目标当起点，但 README 明确说这些目标只是 starting points，不是产品规则。若 Stop gate 误报过多，先用 `VANTAGE_GATE_MODE=off` 关闭并记录误报场景；若两周后仍无法稳定产生“编辑后有新测试”的证据，说明该流程不适合当前团队，不应升级为 adopt。
