# GGGODLIN/gggodlin-cc-harness

- 结论：**值得研读**。建议把它的治理设计当作思路研读，先把「能用机制强制的就不靠自律」和「宣称要附证据」两条搬进自己的工作流，再挑单个元件（如 compact-guard）按 install/ 与 WIRING.md 自行接线小范围试；理由：这份 README 只给了原则、目录映射和风险清单，没有可直接复制执行的配置或步骤，且作者自述路径写死、接线要自己补、多处脚本有破坏性风险，不宜整包照搬。
- 原文：https://github.com/GGGODLIN/gggodlin-cc-harness
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T02:12:28.203Z

## 是什么
这是个人 Claude Code 设定里「治理」那一半的公开版仓库（GGGODLIN/gggodlin-cc-harness，52 stars）。包含六类东西：

- 常驻规则：`CLAUDE.md`、`rules/`、`output-styles/`，以及规则引用的 `references/`。
- hook：把部分规则从「靠模型自律」改成机械检查，注册写在 `settings.json`。
- skill、command、agent：规划、实作、审查、查证这条工作流用到的部分。
- 四套制度：memory（跨 session 记忆）、wiki（收敛后的知识条目）、trial（新工具与新机制的观察期帐本）、摩擦纪录（卡住、绕路、规则没被遵守的事件）。四套都只公开机制，内容换成 `examples/` 里的虚构范例。
- daily-local：每天跑一次的本机分析报告，扫规则用量、摩擦、坏掉的路径等，程式在 `social-info/` 与 `cc-skill-doctor/`。
- compact-guard：context 压缩前存一份可稽核的 checkpoint，压缩后把原始对话证据注回来，含 Codex 支援，在 `compact-guard/`。

作者明确说不包含：个人客制化（statusline、个人工具串接、部落格产线、帐号与浏览器的具体接法）、公司相关治理、能力型 skill（画图、简报之类），以及 memory/wiki/trial/摩擦纪录的实际内容。仓库定位是「参考，不是产品」，不保证整套能在别人机器上跑。

## 具体做法（原文没有给出可直接复制的命令或配置，只有目录指引、设计原则与风险清单；下面是照 README 能照做的部分）

1. **先决定你要拿哪一块，再动手**。前提：你已经有自己的 Claude Code 设定。README 给的入口对照表是：
   - 已有自己的 Claude Code 设定、想让 agent 守纪律 → 先看 `skills/gate-authoring/SKILL.md`、`rules/common/dispatch-and-verify.md`、`friction/PROTOCOL.md` 与 `examples/trials/`。
   - 想挑一个完整的工具来试 → 看 `compact-guard/README.md`（原文称「有完整程式与测试，可以单独安装」）。
   - 想研究 agent 治理、人工授权与出错后怎么恢复 → 看「设计原则」「已知风险」及 `rules/common/git-workflow.md`。
   - 想几分钟内装好整套 → 原文直说目前做不到：路径写死、接线要自己补；单一元件看 `install/`。

2. **按目录对应关系摆文件**。前提：你接受原作者的目录约定，或者准备好改路径。
   - `hooks/`、`rules/`、`skills/` 等目录放进 `~/.claude` 底下就是原本的位置，`settings.json` 里的 hook 指令也照这个位置写。
   - `folder-level/` 是放在「专案资料夹根目录」那一层的设定（原作者的是 `~/Desktop/projects/`），trial 帐本与摩擦机制的 hook 在这里。
   - `social-info/` 与 `cc-skill-doctor/` 是 daily-local 的程式；原作者把它们放在 `~/code/social-info` 与 `~/Desktop/projects/cc-skill-doctor`，程式里的路径照那样写，换位置时要一起改。
   - `compact-guard/` 照 `~/.claude/compact-guard` 的位置写进 hook 注册。
   - `install/` 是各机制的安装说明。
   - `examples/` 是 memory、wiki、trial 帐本、摩擦纪录的虚构范例，只示范格式。

3. **把五条设计原则当成写规则时的模板**（原文这五条就是它们大部分规则的「为什么」）：
   > 决策归使用者，触发归机制。该不该做由人拍板；什么时候提醒、什么时候挡下，交给 hook 与排程，不靠模型记得。
   > 宣称要附证据。说「做完了」「全部」「会挡」时，同一句附上指令与输出；附不出来就把话缩小到实际验过的范围。
   > 能用机制强制的，不靠自律。规则写在文字里容易被忽略，重要的会配一支 hook；hook 挡不住的情况也写明。
   > 先查再问，问就一次问完。查得到的事实自己查；只有会改变范围、权威、对外行为或风险的事才停下来问。
   > 新东西先进观察期。新工具、新 hook 先登记 trial 并排 review 日，到期用真实使用纪录决定留或撤；摩擦事件先记下来，累积到门槛再一起处理。

4. **采用前逐条核对「已知风险」清单**（这是 README 里最可直接照做的检查项）：
   - `commands/pr-review.md` 会临时改 `~/.codex/config.toml`，用固定名称的 `.pr-review-bak` 备份，结束时整份还原——中途被打断或之后又跑一次，期间你自己加进该设定档的内容会被旧备份盖掉。
   - 同一个 `commands/pr-review.md` 用 `git worktree remove --force` 移除审查用 worktree，建立新的之前也会先移除——里面未 commit 或未追踪的档案会一并删掉。
   - 变更含 JSX/TSX 时，在审查席位确认之前就先跑 `npx -y react-doctor@latest`——就算你没选那个角度，也会下载并执行第三方套件。
   - `skills/model-onboard/references/regress-gate.md` 用前后各一次 `ls -A ~` 的差异判断「家目录多出的新档」并清掉——期间别人或别的程式在家目录建立的档案可能被一起删掉。
   - `commands/self-closeout.md` 靠资料夹位置判断是公司 repo 还是个人 repo，个人 repo 会自动 commit 并 push，push 被拒时还会合并后重试——目录配置不同的人可能把公司 repo 推出去。
   - `commands/session-monitor.md` 用 `pkill -f session-limit-watch.sh` 停掉监看程序——同一台机器上其他 session 的监看程序也会一起被杀。
   - `commands/workflow-monitor.md` 同一个 runId 暂停两次时，journal 与 transcript 的 GOLDEN 备份可能来自不同次暂停；失败还原时会把较新的 journal 配上较旧的 transcript。
   - `skills/check-my-stack/SKILL.md` 把「有安装指令、也有本机输入」的工具判成 `Runnable now`，并照指示直接安装、执行（先做安装前快照），没有另外征求同意——评估一个工具的过程可能因此执行第三方程式。
   - `social-info/scripts/local-analysis/recap-daily.sh` 内嵌的分析提示要 agent 用 `xargs -I{} sh -c 'cd {} && pwd -P'` 扫描各个 repo 目录，目录名称会被直接拼进 shell 指令——扫描范围内如果有名称含 `$()` 或反引号的资料夹，就会执行其中的指令。只在你信任的目录树上跑。
   - `social-info/scripts/local-analysis/agnix-daily.sh` 以 `npm_config_ignore_scripts=false npx -y "agnix@$AGNIX_VERSION"` 执行——会盖掉你自己设的 `ignore-scripts`，让该套件的安装脚本照跑。
   - `social-info/scripts/local-analysis/skill-trigger-health.py` 读登记档失败（档案读不到或 JSON 坏掉）时当成空登记档处理，接着把结果写回原路径——你手动标过 `decided: true` 的项目会因此被重设。跑之前先备份登记档。
   - `social-info/scripts/local-analysis/rules-size-weekly.sh` 的「零使用规则候选」要呼叫同目录的 `session-audit.py`，这支没有公开——少了它，周报只会多一行「零使用清单产生失败」，其他段落照常产生；要这段功能得自己接一支输出同样格式的程式。

5. **接被拿掉的接线时，照 WIRING.md 做**。前提：你需要那些功能，并且愿意自己提供介面。文件里会留一整行以「🔌 接線點」开头、指向 `WIRING.md` 的记号；程式里被拿掉的呼叫换成替身，一执行就在 stderr 报出接线点名称并以非零状态结束，不会默默略过。README 列出的接线点有：ChatGPT 网页版席位（仅定义介面）、E2E 测试服务（推荐 TesterArmy）、better-rm、session 历史检索（推荐 ccsi，以 SQLite FTS5 trigram 索引 session jsonl）、workflow-monitor 后端转接、中转站（仅定义介面）、多帐号与帐号判定、后端标记 CC_VENDOR、架构图产生与审批（Archify＋Plannotator）、浏览器自动化（LCU MCP，诊断另用 chrome-devtools MCP）、程式码搜寻（semble）、终端后端（Herdr）、跨模型后端（CLIProxyAPI，需要更多模型时前面加 LiteLLM proxy，第二意见用 Codex CLI 与 openai/codex-plugin-cc）、非官方内容抓取（仅定义介面）、额度资料来源（仅定义介面）。

6. **想单独试一个元件，从 compact-guard 开始**。README 说它「有完整程式与测试，可以单独安装」，安装位置照 `~/.claude/compact-guard` 写进 hook 注册；具体安装步骤在 `compact-guard/README.md`，本材料未含该文件内容。

## 对应的研究问题（对照五个问题逐条说明，只写有依据的）

1. **能力发现**：README 没有直接列「AI 已经能做哪些没想到交给它的工作」的清单，但从目录与机制可以看出它把「让 AI 审计自己的 harness」当成一项常规工作：daily-local 每天扫规则用量、摩擦、坏掉的路径；`skill-trigger-health.py` 检查 skill 触发健康；`rules-size-weekly.sh` 产出「零使用规则候选」周报。具体清单依赖未公开的 `session-audit.py`。

2. **任务匹配**：有线索但不够具体。README 提到 compact-guard「含 Codex 支援」；WIRING.md 的「跨模型后端」建议用 CLIProxyAPI 本机 OpenAI 相容端点、需要更多模型时前面加 LiteLLM proxy、第二意见用 Codex CLI 与 openai/codex-plugin-cc；`agents/` 里有 `advisor-seat.md`、`architecture-critic.md`、`code-reviewer.md`、`deep-explore.md`、`docs-lookup.md` 等席位化角色，说明它是按「席位／角度」而不是按单一模型分工的，但 README 层面只有档名，没有匹配规则。

3. **条件供给**：这是 README 写得最实的一块。规则供给：`CLAUDE.md`、`rules/`、`output-styles/`、`references/`。权限与工具供给：hook 注册在 `settings.json`；被拿掉的私人接线列在 `WIRING.md`，含多帐号与帐号判定、后端标记 `CC_VENDOR`、浏览器自动化、程式码搜寻、终端后端、跨模型后端等，并区分「仅定义介面」与「推荐工具」。反馈供给：摩擦纪录把卡住、绕路、规则没被遵守的事件先记下来；trial 帐本把新工具、新 hook 登记并排 review 日；daily-local 每天跑一次产出分析报告。

4. **主动推进**：设计原则第一条直接回答：「决策归使用者，触发归机制。该不该做由人拍板；什么时候提醒、什么时候挡下，交给 hook 与排程，不靠模型记得。」具体触发源包括 hooks（113 个档案）、排程（daily-local 每天一次、rules-size-weekly 每周）、trial 的 review 日到期、compact-guard 在 context 压缩前存 checkpoint、压缩后注回证据；friction 则是累积到门槛再一起处理。

5. **效果验证**：原则第二条「宣称要附证据」是验证总纲：说「做完了」「全部」「会挡」时，同一句附上指令与输出，附不出来就把话缩小到实际验过的范围。目录里能看到对应机制：`hooks/T1-claim-detect-local-first.sh`、`hooks/T1-evidence-level-detect.sh` 及各自的 test、prompt 档（`T1-evidence-level-prompt-v2.txt`、`T1-system-prompt-v5d.txt`），`references/` 里有 `claim-evidence-examples.md`、`severity-calibration.md`；trial 到期用真实使用纪录决定留或撤。README 未给出具体指标数值。

## 与已有做法的关系

清单中有 Claude Code（adopt）、Semble（try）、Herdr（try），三者都出现在这个仓库里：

- **Claude Code** 是本仓库的运行基座：`hooks/`、`rules/`、`skills/` 等目录就是放进 `~/.claude` 的，`settings.json` 注册 hook。本仓库相当于在 Claude Code 之上加一层治理。
- **Semble** 被列为「程式碼搜尋」接线点的推荐工具（`WIRING.md`）。若你已经在用 Semble，可以把它接到这个 harness 的接线点，让规则/hook 在需要找代码时调用它。
- **Herdr** 被列为「终端后端」接线点的推荐工具。作用类似，都是本 harness 的下层工具。

也就是说这三条与本研究线索是互补而非重复：已有的三条是工具，这条是「怎么把这些工具管起来、什么时候挡、什么时候记账」的治理层。

## 证据与局限

**原文给了什么**：README 自述的完整目录树与档案数量（`hooks/` 113 档、`skills/` 198 档、`scripts/` 100 档、`commands/` 58 档、`agents/` 33 档、`social-info/` 76 档、`install/` 45 档、`compact-guard/` 23 档含 bin/src/test、`rules/` 14 档、`references/` 14 档、`folder-level/` 15 档、`examples/` 8 档等）；五条设计原则；「从哪里开始」入口对照表；完整目录对应规则；15 个接线点及其推荐工具；以及一份写得很具体、带档案名的「已知风险」清单。52 stars（来自抓取指标）。`compact-guard/` 有完整程式与测试、可单独安装，是原文明确说可以单独用的部分。

**哪些只是作者主张**：「能用机制强制的，不靠自律」「宣称要附证据」「决策归使用者，触发归机制」都是设计主张，README 没有给出对照实验或量化收益；「有完整程式与测试」是对 compact-guard 的自述，本次材料未附该目录内容，无法直接核验；daily-local 能扫出什么、claim/evidence 检测的准确率如何，也需要看未提供的程式。

**适用条件与风险**：作者自己声明「不保证整套能跑」——路径、工具与排程是照原作者机器写的，被拿掉的接线要自己接；issue 欢迎开但不保证回应；不收 PR，公开版每次发布都由私人版整份重建，直接改这里会被下次导出盖掉；`skills/mutation-testing` 含 Business Source License 1.1 内容，不属 MIT。已知风险清单里有 12 条具体危险行为（覆盖 config、删未提交 worktree、pkill 误杀、清家目录新档、自动 push 到公司 repo、shell 注入、绕过 npm `ignore-scripts`、重设登记档、依赖未公开的 `session-audit.py`），照抄前必须逐条读过原档。

**本材料的局限**：输入只有 README，没有 rules、skills、hooks、settings.json、WIRING.md、install/、compact-guard README 的实际内容，所以无法给出可直接复制执行的步骤或配置；只能依据 README 的判断。这也是 verdict 压到 study 而不是 try 的原因。

## 怎么试、怎么验证

**最小试用方式**（不要整包安装）：

1. 选一个机制，不要选整套。若目标是「让 agent 守纪律」，最小试用是：在自己现有的 `~/.claude` 下，照 `skills/gate-authoring/SKILL.md` 写一条规则并配一个 hook，把这条规则从「靠模型自律」变成机械检查；对照 `rules/common/dispatch-and-verify.md` 补一条「宣称要附证据」的约束。前提：已有 Claude Code 设定与 `settings.json`，且愿意改自己的路径。
2. 想先试一个完整工具：只按 `compact-guard/README.md` 单独安装 compact-guard（原文称有完整程式与测试），位置照 `~/.claude/compact-guard` 写进 hook 注册。本次材料未含该 README，具体步骤要打开原档再确认。
3. 想试流程：照 `friction/PROTOCOL.md` 与 `examples/trials/`（后者是虚构范例、只示范格式），给一个新工具登记 trial 并排一个 review 日，同时开始记摩擦事件。前提：先接受「内容自己填、格式照范例」。

**判断有没有改善的指标**（从原文机制可以推出的观测点，原文没有给数值目标）：

- 规则是否被遵守：规则用量、以及 weekly 的「零使用规则候选」清单长度（注意 `rules-size-weekly.sh` 这段依赖未公开的 `session-audit.py`，要自己接）。
- 摩擦是否下降：摩擦纪录里「卡住、绕路、规则没被遵守」的事件数量与类型随时间的变化。
- 新东西有没有失控：trial 帐本里到期项目是否都做了留/撤决定，以及决定是否有真实使用纪录支撑。
- 宣称是否可稽核：claim-detect 与 evidence-level-detect 两支 hook 在你自己的会话里触发的情形，「说做完」时能不能附出指令与输出。
- 环境有没有变坏：daily-local 报出的坏掉路径数量。

**跑之前的三条硬前提**：先备份登记档；只在信任的目录树上跑 local-analysis（目录名会被直接拼进 shell）；先读完「已知风险」清单再执行任何 command/skill。
