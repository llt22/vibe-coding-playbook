# BlackAngel242/MyTeam

- 结论：**值得一试**。若你已经在用 Herdr 并行跑多个 AI 智能体，值得小范围装一套 MyTeam 本地控制台试用，按 README 给出的安装/启动/队列/危机开关流程跑通一轮；理由是本仓库给出了可直接照做的安装命令、端口、环境变量和操作流程，且把「监控—排队—干预—事实核验」做成了具体界面与接口，但它本身是监控层而非能力层，且原文存在若干可疑的模型名称，需先小范围验证可信度。
- 原文：https://github.com/BlackAngel242/MyTeam
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T16:09:59.461Z

## 是什么

MyTeam（Bureau des agents）是一个像素画风格的本地 Web 控制台（MIT 许可），用于**监视、阅读和调度**在 Herdr（会话/进程管理器）下并行运行的自主 AI 智能体团队。作者 DrSmoke（BlackAngel242），仓库约 32 stars。

它的定位不是替代某个 AI 工具，而是把「一堆散开的终端」变成一张可视化工位图：

- 24 种 Herdr 支持的工具有统一检测、工位、16×16 像素徽标、原始状态（工作/空闲/等待/完成/配额暂停）、发送指令、排队、读取终端；
- 仅对 **Claude Code、Codex、OpenCode** 三款做增强遥测（只读解析本地日志：结构化 Markdown 回复、token/轮次、集体讨论流、行动计划）；其余工具明确显示「该工具未暴露」。
- 声称 100% 本地：只监听 `127.0.0.1`、无 npm 依赖、无出网请求、不存 API key。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Node.js ≥ 22，且已安装 [Herdr](https://github.com/atoll92/herdr)。Windows / macOS / Linux 均可。无需 `npm install`。

### A. 安装

1. 选安装方式。

   方式一（推荐，无需 Git）：到 GitHub Releases 下载最新 ZIP → 解压到任意目录 →
   - Windows：双击 `Installer MyTeam.bat`（若 Node ≥ 22 则启动动画安装器；否则退化为文本模式，可用 winget 安装 Node 后重跑）。
   - macOS / Linux：
     ```bash
     bash scripts/installer.sh
     ```
     若已有 Node.js：
     ```bash
     node scripts/installateur-anime.mjs
     ```

   方式二（开发者，克隆仓库）：
   ```powershell
   git clone https://github.com/BlackAngel242/MyTeam.git
   cd MyTeam
   powershell -ExecutionPolicy Bypass -File scripts\installer.ps1
   ```
   或 macOS / Linux：
   ```bash
   git clone https://github.com/BlackAngel242/MyTeam.git
   cd MyTeam
   bash scripts/installer.sh
   ```

2. 如果想先看动画安装器而不改动机器，跑演示模式：
   ```bash
   node scripts/installateur-anime.mjs --demo
   ```

3. 安装脚本会做这些事（前提：Herdr 在 PATH 或已指定路径）：校验 Node ≥ 22 与 Herdr → 创建 Herdr 2×2 网格（`Chef`、`Agent 2`、`Agent 3`、`Agent 4`）→ 检测 24 种兼容工具 → Windows 下可选装 Clink → 执行 `herdr integration install` → 安装主控技能（`herdr --skill` 或 `CHEF.md`）→ 写方向指引 → 建 3 个桌面快捷方式（含「Herdr 和桌面」组合）→ 运行 `node scripts/init-kit.mjs` 初始化团队工具包。
   明确不会：装 npm 依赖、索取或存 API key、静默安装（`-Oui` / `--oui` 也不会自动批准，仍需逐个 o/n 确认）。
   可用参数：`-DryRun` / `--dry-run`（演练）、`-Lang fr|en` / `--lang fr|en`、`-Port` / `--port`、`-HerdrChemin` / `--herdr-chemin`、`-SansRaccourci` / `--sans-raccourci`。
   Windows SmartScreen 拦截时：右键 `.bat`（或解压前的 `.zip`）→ 属性 → 勾选「解除锁定」→ 确定；或点「更多信息」→「仍要运行」。

4. 启动本地服务：
   ```powershell
   node server.mjs
   ```
   浏览器打开：
   ```text
   http://127.0.0.1:4317
   ```

5. 首次使用的 6 步路径（README 原文顺序）：
   1. 打开「Herdr 和桌面」快捷方式（或先开 Herdr 再 `node server.mjs`）。
   2. 确认 Herdr 里 4 个面板按 2×2 打开，并在 `http://127.0.0.1:4317` 看到实时工位。
   3. 主控面板里，队长读 `CHEF.md` 和 `AGENTS.md`，用 `herdr agent list` 列出队友待命。
   4. 从控制台给队长发第一条指令，观察它「走到」队员工位递交任务文件夹。
   5. 打开「任务」标签，核对 `TODO.md` 勾选状态与已发布行动计划的真实进度（无编造百分比）。
   6. 找到「危机室」按钮（`Ctrl+Maj+C`），用于瞬间冻结所有指令发送并请求礼貌中断（Esc）。

### B. 关键操作机制（可照做的用法）

6. **排队与优先级**：目标智能体忙或处于配额暂停时，按钮变为「加入队列」，指令被安全延后；勾选「优先」（`priority: "haute"`）可插队到该智能体的普通指令之前；点「提到队首」可把等待中的普通指令升级；**等待超过 30 分钟的普通指令会被自动提升为高优先级**（防饥饿）；每条指令可一键撤回，绝不强推给忙碌的智能体。
7. **危机室（总断路器）**：按 `Ctrl+Maj+C` 或从命令面板触发，所有指令下发立即冻结（HTTP 423）并挂起队列而不改动任何内容；可用 `POST /api/crise/arret` 请求礼貌中断——它发送 Herdr 的标准 `esc` 键，**从不用 kill 强杀**；状态原子写入 `.bureau/crise.json`（文件损坏时按「危机激活」的安全侧处理）。
8. **群发（两段式武装发送）**：勾选可用智能体（或「全选可用」）→ 第一次点「发送」进入武装状态并列出收件人 → 第二次点确认，逐个经 Herdr 发送。
9. **队长监听中继**：在 `.bureau/relais.json` 中开启（默认关闭），一旦有队员完成任务，就向队长队列投递一条中性消息：
   ```text
   {名} vient de terminer. Lis son panneau avant de lui confier la suite.
   ```
   危机室激活时不发送，也不会发给队长本人。
10. **队长交接**：可在「团队」标签指定任意在线智能体当队长，或恢复默认（第一个面板）；选择持久化在 `.bureau/direction.json`（不在 Git 内）。队长进入配额暂停时，界面会主动建议交接给可用替补，交接消息经确认后才发出。
11. **文件附件**：给排队指令附带本地文件（上限 2 个、每个 20 MB），发送前以不覆盖方式复制进智能体工作目录；处理过程记录在「团队」标签的「已托付文件」区。
12. **事实化任务跟踪**：不要依赖百分比估算——「任务」标签的进度条严格按项目 Markdown（如 `TODO.md`）里已勾选任务的比值计算；没有已发布计划时如实显示「暂无智能体发布计划」。
13. **失败留档**：每遇到一个错误就写进 `LESSONS.md`，作为团队防回归记录（README 的工程原则第 5 条）。

### C. 配置与运维

14. 环境变量：
    - `BBUREAU_PORT`：修改 HTTP 端口（默认 `4317`）——原文写作 `BUREAU_PORT`；
    - `BUREAU_HERDR_PATH`：Herdr 不在 PATH 时指定其绝对路径。
15. 页面底部自定义（本地、不发布）：创建 `.bureau/pied.json`：
    ```json
    {"gauche": "votre texte", "droite": "un contact", "enseigne": "BUREAU DE MON EQUIPE"}
    ```
16. 自检与关闭：
    ```bash
    npm test
    npm run check
    ```
    停止服务：在运行 `node server.mjs` 的终端按 `Ctrl+C`。

### D. 界面侧的可用开关（用于降低监控成本）

17. 键盘优先：`Ctrl+K` 命令面板（找智能体、开工位、写指令、开团队看板、切标签）；`?` 打开 7 步引导、图例、完整快捷键表与信号设置。
18. 降低打扰/省资源：画布「暂停」按钮；系统开启 `prefers-reduced-motion` 时场景默认静止（仍每分钟刷新时间与光照）；后台标签页每 15 秒轮询并出 Windows 通知；终端刷新 3 秒一次、标签隐藏时暂停、每块磁贴一次只读一次；鼠标选中文本时自动暂停刷新以免选区消失。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：本仓库把「已经能交给 AI 但常被忽略的工作」具体化为**多智能体并行值守**：队长读 `CHEF.md`/`AGENTS.md` 后用 `herdr agent list` 点名队友、分派任务、汇总结果。它展示的是「让人只做监督与决策，把并行的执行与自检交给智能体队列」这一层能力边界。
- **任务匹配**：README 给出 24 款工具的兼容矩阵，并区分两档——全部 24 款只有「自动检测 + 工位 + 原始 Herdr 状态 + 发指令 + 排队 + 读原始终端」；只有 **Claude Code / Codex / OpenCode** 额外提供「可读回复、token 与轮次、集体讨论流、行动计划」的只读日志解析。即：需要读懂智能体「说了什么」时优先选这三款，只需要看「在不在跑」时任何一款都行。
- **条件供给**：需要提供 Node ≥ 22、Herdr、各智能体的工作目录、`CHEF.md`/`AGENTS.md`/`TODO.md`/`LESSONS.md` 等 Markdown 支柱文件，以及（排队的）附件文件；权限侧强调只监听 `127.0.0.1`、精确 Origin 校验、随机会话令牌 `X-Bureau-Token`、不接受浏览器传来的任意路径。反馈回路靠 3 秒刷新 / 后台 15 秒轮询 / 阻塞·完工·配额暂停·分派的音效与通知。
- **主动推进**：可由**事件**触发——队员完工触发队长监听中继消息；由**状态**触发——目标忙碌或配额暂停自动转排队、等待超 30 分钟自动升为高优先级、队长进入配额暂停主动建议交接；由**时间**触发——基于本机时钟的昼夜光照（6:30 / 19:30 固定），17:30 起灯渐亮，配额暂停工位显示确切恢复时间。
- **效果验证**：进度严格等于 `TODO.md` 已勾选任务的比值，不发明百分比；发送日志记录时间戳、收件人、文本与 Herdr 返回状态；每次错误写入 `LESSONS.md`；`npm test` 每次打印精确用例数、`npm run check` 做语法校验。

## 与已有做法的关系

清单中相关条目：

- **Herdr（try）**：MyTeam 是 Herdr 之上的控制/监控层，**强依赖**它——没有 Herdr 就跑不起来。二者是叠加关系：Herdr 管会话，MyTeam 管「看与调度」。
- **Claude Code（adopt）**：属于 24 款受支持工具，且是 3 款增强遥测之一；MyTeam 可作为它的运行监督面板。
- **OpenCode（watch）**：同属 3 款增强遥测之一。
- **Cline（watch）、Cursor（watch）、Hermes（watch）**：均出现在 24 款通用支持名单中，只享受基础档能力。
- **Semble（try）**：清单未说明其定位，无法判断关系。
- **Lumen（drop）、Mastra（drop）**：与本文无直接关系。

清单中没有与本控制台直接等价的「多智能体监控台」条目；已有做法更偏单个工具或编排库，本仓库补的是**运行期观察与人工闸门**这一环。

## 证据与局限

**原文给出的可核实内容**（均为 README 自述）：具体的安装命令与参数、端口 `4317`、环境变量名、`Ctrl+K`/`Ctrl+Maj+C`/`?` 等快捷键、HTTP 423 冻结接口 `POST /api/crise/arret`、`.bureau/crise.json`/`direction.json`/`relais.json`/`pied.json` 的持久化路径、24 款工具清单、`npm test`/`npm run check` 命令、MIT 许可。

**只是作者主张、无外部佐证**：
- 「100% 本地、零 npm 依赖、无出网、不存 key」「事实真实、不模拟智能体、不发明百分比」——属设计声明，本次材料中无第三方审计或测试报告。
- 所有界面行为（队长巡场、配额暂停显示恢复时间、危机室光晕等）只有描述，没有截图以外的运行证据与用户案例；stars 仅 32，单人作者。
- README 中出现的模型名 **GPT-6.1-Sol、Claude Opus 5.5 / Sonnet 5.5、Gemini 3.8 Flash、MiMo V2.6 Pro** 与当前已知模型命名不符，可能是未来命名、占位或文档幻觉，应作为**可信度警示**：不能据此推断其真实能力，也不要把这些名字当作可用模型去配置。
- 未给出性能数据、并发上限、失败率、与其它方案对比。

**适用条件**：必须在 Windows/macOS/Linux 上装 Node ≥ 22 与 Herdr；面向的是**已经并行跑多个智能体**的开发者/研究者/编排者；单智能体或不用 Herdr 的场景收益很小。中文材料下还要注意文档主语言为法语（有英文版）。

## 怎么试、怎么验证

**最小试用（半天内）**
1. 先跑 `node scripts/installateur-anime.mjs --demo` 看安装器是否与文档一致（不改机器，验证文档可信度的第一步）。
2. 确认 Herdr 可用后，用 `git clone` + `bash scripts/installer.sh`（或 Windows 的 `installer.ps1`）做一次 `-DryRun` 演练，再正式安装。
3. `node server.mjs`，打开 `http://127.0.0.1:4317`，只接 **2 个**智能体（1 个队长 + 1 个队员），跑一轮：发指令 → 队员完工 → 开中继看队长是否收到提醒 → 点「任务」看 `TODO.md` 勾选比例是否与手工数的一致。
4. 用一次 `Ctrl+Maj+C` 危机室，确认队列确实冻结、恢复后原样还在。

**判断有没有改善的指标**（建议记录 1 周对照）
- **切换成本**：一天里为「看某个智能体在干什么」而手动切终端的次数（试用前 vs 试用后）。
- **漏接事件**：等待人工确认（Herdr 里举手 `?`）或配额暂停超过 10 分钟才被你发现的次数——目标是降到 0。
- **队列效率**：排队的指令里，被 30 分钟规则自动升优先级 / 被你手动「提到队首」的条数，以及平均等待时长。
- **吞吐**：在同样注意力下能同时保持有效运行的智能体数量（2 → 3 → 4）。
- **可信度校验**：连续 3 天把「任务」标签显示的 `TODO.md` 比例与你自己数一遍做比对，若不一致则说明该工具的事实层不可信，应降级为 study。
- **反向指标**：如果一周后你仍然主要看终端而不看这张控制台，或通知噪音让你关掉了音效/通知，说明它没带来净收益，应停止使用。
