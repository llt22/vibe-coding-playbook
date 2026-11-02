# dheerajponnaganti/thenwise

- 结论：**值得一试**。建议先在单个 Claude Code 仓库小范围试用：按两条命令安装并运行 thenwise setup/doctor，用隐藏答案的历史问题做前后对比；理由是它把历史记忆检索、自动注入和隐私控制做成了可照做流程，但效果数字来自作者自测，需自行验证后再推广。
- 原文：https://github.com/dheerajponnaganti/thenwise
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T20:13:53.724Z

## 是什么
Thenwise 是一个 Claude Code 插件，目标是把本机上的 Claude Code 历史聊天（脱敏）、git 提交、PR、CLAUDE.md、计划版本和指定笔记目录汇入一个本地 SQLite 记忆库，再通过七个 memory_* 工具和 hooks 在需要时把历史记录交给 Claude。原文强调它 100% 本地运行，不需要模型或 API key，搜索走全文、日期和链接，不走模型；默认不发送遥测，只有每日一次 npm 版本检查默认开启。数据目录为 ~/.thenwise（或 THENWISE_HOME）。

它的工具包括 memory_search、memory_current、memory_why、memory_tried、memory_asof、memory_trace、memory_read；回答会引用来源和日期，较新记录覆盖同一问题时会标注。

## 具体做法
1. 安装插件。前提：已使用 Claude Code；Node 22.16+；有 git 仓库；要记忆的历史位于 ~/.claude/projects。安装后开新会话，并在 /plugin 中为该 marketplace 打开自动更新。
```
/plugin marketplace add dheerajponnaganti/thenwise
/plugin install thenwise@thenwise
```
Claude Code 2.1.275+ 也可用一行：
```
/plugin install thenwise --marketplace dheerajponnaganti/thenwise
```
如果要在终端直接用 thenwise 命令：
```
npm install -g thenwise
```
2. 初始化并检查。打开 Claude Code 会话后，Thenwise 会在后台归档过去聊天并构建存储；也可以主动运行 setup 选择项目、笔记位置（独立文件夹或 Obsidian vault）、是否用 gh 拉 PR、是否备份。doctor 会检查并给每个问题一行修复建议；status 看已存内容和上次同步时间。
```
thenwise setup
thenwise doctor
thenwise status
```
3. 日常把历史检索当作前置步骤。可以直接在 Claude Code 里用命令，也可以让 Claude 自己调用 memory_* 工具。
```
/thenwise:status
/thenwise:resume [topic]
/thenwise:why <words>
/thenwise:tried <words>
/thenwise:asof <date> <words>
/thenwise:deadend <what failed>
/thenwise:decide <what was decided>
/thenwise:backup
/thenwise:inbox
```
对应工具用法：memory_search 找相关记录；memory_current 问当前设置；memory_why 问为什么这样决定；memory_tried 问以前试过什么；memory_asof 问某日当时是什么状态；memory_trace 问某个文件的完整历史；memory_read 读完整记录。原文说这些回答都带来源和日期。
4. 启用或关闭自动注入。默认 hooks 会在会话开始后台同步；最近 7 天有会话的仓库会加最多 200 token 的启动简报；压缩后加最多 1,500 token 的 resume brief；问过去的问题最多给 3 个线索（约 300 token），大多数提示不给；打开文件时最多加 600 token 的死胡同和决策，每个文件每会话一次。要关闭其中两类自动提示，在 config.json 中写：
```
"hooks": { "prompt_map": false, "startup_brief": false }
```
原文还说明 hook 不会让聊天失败，错误进日志。
5. 控制隐私和删除。某次聊天不记录：在提示开头或结尾加 [no-memory]，或单独一行写 [no-memory]。删除单条聊天或整个项目：
```
thenwise forget <session id>
thenwise forget <project folder>
```
暂停/恢复某项目：
```
thenwise off [--project <folder>]
thenwise on [--project <path>]
```
彻底停用并列出手动删除文件：
```
thenwise uninstall
```
6. 生成可读笔记库。把决策、死胡同、时间线和文件历史写成 Markdown：
```
thenwise vault write
```
输出到所选 vault 的 _thenwise/ 文件夹；可直接用 VS Code、任意文本编辑器、GitHub 或 Obsidian 看。原文强调自己的笔记只读不重写；也可把 vault 放进 Git 或用 folders 备份。
7. 团队版按需再加。前提：团队自己有一台小服务器；网络访问时要 https 反向代理，客户端除 localhost 外拒绝 plain http。先单机用，确认有价值再开团队：
```
thenwise team serve --dir ~/team --console <hub build>
thenwise team invite alice --dir ~/team
thenwise team join <url> <token>
thenwise share <note>
thenwise team search <words>
thenwise team share-chats <repo path>
thenwise team unshare-chats <project or session id>
```
原文说共享前会预览和脱敏，聊天原文不离开本机，除非主动共享某个项目的聊天；服务器宕机时共享排队，下次会话开始重试。
8. 可选自动化。原文给出 config.json 的 team.auto_share、team.auto_share_projects、capture.auto 配置项：可自动共享已接受的决策/死胡同，或每天通过 claude -p 把新聊天蒸馏成 inbox 提案。两者默认关闭。建议先不开，等手动流程稳定后再评估。

## 对应的研究问题
- 能力发现：原文把“翻历史”拆成可调用的具体能力：查为什么、查试过什么、查某日状态、查文件历史、查当前设置。这提示可以把“决策复盘、避免重复踩坑、接手旧项目、回答审计式问题”交给 Claude，而不是只让它写新代码。
- 任务匹配：适合已在用 Claude Code、历史主要沉淀在本地聊天和 git 的代码/项目工作；单机模式不需要模型/API key，搜索是本地全文、日期、链接，毫秒级；团队模式适合共享决策和死胡同，但要多一台自托管服务器。不适合非 Claude Code 工作流，或没有历史数据可检索的场景。
- 条件供给：需要安装插件、Node 22.16+、git、可读的 ~/.claude/projects 历史；用 thenwise setup 选择项目、笔记位置、PR 和备份；团队需要服务器、邀请 token、https 反代；权限和反馈通过 [no-memory]、thenwise off、thenwise forget、inbox 审核、deadend/decide 命令来给。
- 主动推进：有明确的触发式行为：会话开始后台同步；最近 7 天活跃仓库加启动简报；压缩后加 resume brief；问过去时给最多 3 个线索；打开文件时加该文件的死胡同/决策；每日备份和版本检查；可选每日 capture 蒸馏到 inbox；团队共享失败排队重试。这些是时间、事件、状态触发的，不是每次靠人问。
- 效果验证：原文用隐藏答案盲评给出个体 93% vs 37%、团队 88% vs 17%，以及 token 和耗时对比；还称 2,500 条聊天安装后 84 秒可记起，hooks 约 50ms。它把验证指标落在“答对率、来源引用、token、耗时”上，可直接借鉴为试用指标，但数字需自行复现。

## 与已有做法的关系
- 清单中的 Claude Code 是运行底座：Thenwise 是 Claude Code 插件，不替代 Claude Code；原文明确说 CLAUDE.md 和 Claude 自带记忆负责常驻规则，Thenwise 负责历史（决策、试错、某日事实），并且会读取 CLAUDE.md。
- 清单中的 Obsidian 是可选展示/存放位置：Thenwise 输出普通 Markdown vault，可放进 Obsidian 用 backlinks 和 graph，但不需要 Obsidian，VS Code/文本编辑器/GitHub 也能读。由于清单把 Obsidian 标为 drop，这不构成采用阻碍。
- 清单中没有同类的“本地历史记忆 + 自动注入 + 团队共享”插件条目；因此主要对照就是 Claude Code 自带能力和上述 Obsidian 可选集成。

## 证据与局限
- 原文给出的可核对内容：安装命令、setup/doctor/status、七个 memory_* 工具、hooks 的 token 上限和触发条件、隐私开关、团队命令、config.json 配置项。这些足够支撑小范围试用。
- 效果数据来自作者自述的隐藏答案盲评：个体 93% vs 37%、团队 88% vs 17%；个体 token 约一半、1.9 倍更快（14 秒 vs 26 秒），团队 token 少 39%、1.5 倍更快（16 秒 vs 24 秒）；2,500 条聊天 84 秒后可记起；hooks 约 50ms；无记忆的聊天只增加约 1% token。原文链接 docs/eval.md，但材料未包含评测题目、评分细则和原始数据，无法独立核验。
- 项目规模：GitHub 搜索指标显示 30 stars；不是大规模独立验证过的成熟工具。Node 22.16+、Claude Code 2.1.275+（一行安装）等版本条件也要满足。
- 适用条件：历史确实在 Claude Code 聊天和 git 中；愿意让插件读本地历史；团队模式要自托管服务器和维护 token/反代/备份。
- 隐私边界：原文称本地存储、默认无遥测、密钥会在写入前替换为 [secret masked]，团队服务器再脱敏一次；但也说明会漏掉跨两行折断的 key，且 process.env.API_KEY 这类代码仍可读；forget 也列出了够不到 Claude Code 自有文件和 Time Machine 副本。默认每日一次 npm 版本检查，可用 thenwise update-check off 关闭。

## 怎么试、怎么验证
最小试用：
1. 选一个非关键但历史较丰富的 Claude Code 仓库；先不安装，准备一组有标准答案的历史问题，覆盖“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”。把答案藏起来，用 plain Claude Code 新会话回答并记录。
2. 安装后开新会话，运行 thenwise setup、thenwise doctor、thenwise status，确认项目被收录、数据目录和 hooks 正常。
3. 用同一组问题在新会话重问；用 /thenwise:why、/thenwise:tried、/thenwise:asof 或让 Claude 调 memory_* 工具。盲评答案是否正确、是否引用了正确来源和日期。
4. 专测“该不该主动插入”：问一个与历史无关的当前编码问题，看是否被无关记忆打扰；打开一个已知有死胡同的文件，看是否提示；问一个近期项目，看启动简报是否有用。用 thenwise logs --errors 看 hook 错误。
5. 测隐私开关：用一条测试聊天加 [no-memory]，确认之后搜不到；用 thenwise forget 删除测试记录，确认检索不到。不要用真实密钥做测试。
6. 若单机有效再评估团队版；团队版另测共享预览、脱敏、token 权限、服务器故障排队和 unshare 回收。
判断指标：
- 历史问题答对率（盲评）是否明显高于未安装时；
- 引用来源/日期是否正确，是否把旧记录误当当前事实；
- token 消耗和回答耗时是否下降或至少不恶化；
- 无关提示被注入的比例、文件打开时提示的命中率；
- setup/doctor/logs 的错误数、hook 是否拖慢会话；
- 隐私检查是否通过（[no-memory]、forget、脱敏、团队共享边界）。
