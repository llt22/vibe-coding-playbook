# OjasMishra32/applytwin

- 结论：**值得一试**。值得在求职、投递这类流程化工作上小范围试跑，但只在默认的“填完停下等人工提交”模式下试运行，不要开启自动提交，也不要给投递网站密码和邮箱验证码权限；同时把它的“上下文资料库（Career Vault）+ 逐岗位改写 + 事实校验 + 人工确认检查点 + 去重记忆”结构提取出来，用于其他工作。理由：README 给出了可直接照做的安装命令、CLI 子命令、agent 提示语和各环节约束，是可执行的而非纯观点；但其有效性只有作者主张，缺少任何结果数据，且安装脚本与凭据处理存在明显风险。
- 原文：https://github.com/OjasMishra32/applytwin
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T00:37:53.822Z

## 是什么

ApplyTwin 是一个跑在本地（http://localhost:4747）的求职自动化应用，复用你已有的 Claude Code 或 Codex 订阅作为 agent 运行时（README 明确说不要 API key、不加订阅）。它把求职拆成三段流水线：

1. **找岗位**：读取 600 多家公司的招聘页（Greenhouse、Lever、Ashby、Workday、SmartRecruiters），外加社区实习岗位追踪表、The Muse、Hacker News “Who is hiring” 和远程岗位板；按角色、级别、地点、毕业时间、是否需要签证担保、经历覆盖率给出匹配分，目标公司排到队首。
2. **逐岗位定制简历**：所有经历集中放在 Career Vault，对每个岗位挑最相关的条目、按该读者的顺序重排、压到一页；改写后有一道事实校验，凡是新增了原始条目里没有的数字、工具或断言的一律打回；数字、职位、雇主、学历、奖项不允许变动；8 个模板都是单栏真文本，便于 ATS 解析。
3. **填表投递**：由你自己的 Claude Code 或 Codex 打开浏览器，按该系统对应的 playbook 填表、用已保存答案作答、上传定制后的 PDF，然后停在复核页等你按 Submit；设置里可开启“自行提交”。

另外有去重记忆（同公司同岗位不重复投）、新问题只问一次并记住答案、可从 Simplify/Huntr/Teal/Notion/Google Sheet 导入历史投递 CSV。README 还列了它“永远不做”的事：不向 AI 暴露密码、不解 CAPTCHA、不接受法律协议、不改简历上的事实性字段——碰到就停下并通知你。

## 具体做法（编号步骤）

以下步骤均按 README 原文整理，前提条件写在每步里。

**1. 备齐前置条件**（缺任一项则安装器会报出并提示）
- Python 3.9 或更新
- Node.js（agent 需要它驱动浏览器）
- 已付费的 Claude Code 或 Codex

**2. 安装**
- Mac/Linux（终端）：
```bash
curl -fsSL apply.twinly.tech/install | bash
```
- Windows（PowerShell）：
```powershell
irm apply.twinly.tech/install.ps1 | iex
```
- 更稳妥的替代路径（想先看代码再用）：
```bash
git clone https://github.com/OjasMishra32/applytwin.git
cd applytwin
./install.sh               # 连接 Claude Code 和 Codex，然后打开 http://localhost:4747
python3 tests/smoke.py     # 冒烟测试
```
前提：安装目录为 `~/.applytwin-app`（Windows 为 `%USERPROFILE%\.applytwin-app`），数据在 `~/.applytwin`。注意许可证为 PolyForm Strict 1.0.0：可非商业安装运行，不可复制、修改、再分发或据以构建衍生作品。

**3. 打开本地应用并登录**
- 浏览器访问 http://localhost:4747（这是应用本体；apply.twinly.tech 只是取安装命令的站点）。
- 用 Google 登录，配置、答案、投递记录同步到账号，换电脑可续。
- 不想上报安装统计：设置里关掉 “Count my install”，或设 `APPLYTWIN_NO_TELEMETRY=1`。

**4. 供给上下文（这一步决定后面质量）**
- 上传现有简历（PDF、Word、LaTeX 或纯文本）。
- 一次性回答常规申请表问题；新问题后续只问一次并记住。
- 建议先导入历史投递 CSV（Simplify / Huntr / Teal / Notion / Google Sheet），让去重生效。

**5. 跑设置自检**
```bash
applytwin doctor
```
前提：能看到 `applytwin` 命令。若提示 command not found，开一个新终端（安装器把命令写进 PATH，已开的窗口看不到）。

**6. 接上 agent（若尚未登录）**
```bash
npm install -g @anthropic-ai/claude-code   # 然后运行：claude   并输入 /login
npm install -g @openai/codex               # 然后运行：codex login
```
登录后：
```bash
applytwin install-agents
```
也可在应用 Autopilot 页按 **Install and sign in**，它会自动装 agent 并打开官方登录页。

**7. 启动自动流程（先保持默认复核模式）**
- 在 Autopilot 页按 Start。它在自己的浏览器窗口里操作，需要你时通知你。
- 投递网站账号创建默认关闭；如需开启，在设置里单独填一个“只用于求职网站”的邮箱和密码——密码由应用自己输入页面，填表的 AI 看不到，且只留在本机；邮箱验证码读取同样需要单独开启。
- 建议第一轮不要打开 “Submit applications on its own”。

**8. 用命令行跑单个环节（不需要 agent 也能用）**
```bash
applytwin scan
applytwin jobs
applytwin tailor JOB_ID
applytwin ats JOB_ID
applytwin templates
applytwin watch --every 120
applytwin update
applytwin help       # 完整命令列表
```

**9. 用 agent 对话驱动（需要 agent 能驱动浏览器：Claude in Chrome，或 Claude Code 的 computer use，或 Codex 的浏览器工具）**
```
set me up with applytwin
twin: scan and show my top 20
twin: tailor my resume for <job id or URL> and explain the choices
twin: apply to my top 10
twin: review my resume like a recruiter
```

**10. 排障**
- 首页打不开：首次启动可能要一分钟，等一等再刷新；不行就 `applytwin app` 手动起（Mac/Linux 先开新终端）。端口 4747 被占用会自动换端口并打印地址，也可指定：`applytwin app --port 5050`。Mac/Windows 日志在用户主目录 `.applytwin` 文件夹下的 `server.log`。
- Windows 报 “running scripts is disabled”：改用 `claude.cmd`、`codex.cmd`、`npm.cmd`，或从命令提示符运行；或 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。
- Python 缺失或过旧：
```powershell
winget install Python.Python.3.12
```
- Node.js 缺失：从 https://nodejs.org 装 LTS（Windows 可 `winget install OpenJS.NodeJS.LTS`）。

**11. 把不可越过的边界当配置写死（照抄它的约束清单）**
- 不把密码给 AI
- 不解 CAPTCHA
- 不接受法律协议
- 不改简历上的数字、职位、雇主、学历、奖项
- 碰到以上任一项即停下并通知人工

## 对应的研究问题

**1. 能力发现（哪些工作可以交给 AI）**
README 明确展示了三类通常不会想到托付的工作：跨 600 多家公司招聘页与多个社区岗位源的持续岗位发现；按单个 JD 重排、裁剪、压缩到一页的简历改写；以及打开第三方申请表逐字段填写并上传附件。并且给出了匹配分的构成维度（角色、级别、地点、毕业时间、担保需求、经历覆盖率）——这是“把岗位判断拆成可计算维度”的具体样例。

**2. 任务匹配（什么工作配什么模型、工具、协作方式）**
- 模型侧：不调用 API，直接复用 Claude Code 或 Codex 的订阅额度；填表环节明确需要“能驱动浏览器的 agent”（Claude in Chrome / computer use / Codex 浏览器工具）——即把“需要操作 GUI”的任务匹配给带浏览器的 agent。
- 工具侧：按 ATS 系统分 playbook（`playbooks/`）；简历模板强制单栏真文本以适配 ATS 解析；CLI 路径（scan/jobs/tailor/ats/templates/watch）在无 agent 时也可用，即把可脚本化的部分与需要 agent 的部分分开。
- 协作方式：默认人机分工是“AI 填到复核页、人按 Submit”，只有显式开启才自动提交。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**
- 信息：Career Vault（把全部经历集中一处）、一份现有简历（PDF/Word/LaTeX/文本）、一次性填好的常规申请问题答案、历史投递 CSV。
- 工具：Python 3.9+、Node.js、Claude Code 或 Codex、可被驱动的浏览器。
- 权限：Google 登录（同步配置与投递记录）；可选开启的求职站专用邮箱+密码；可选开启的邮箱验证码读取；这些默认关闭，需要逐项显式打开，且密码不经模型。
- 反馈：新问题只问一次并记住答案；遇 CAPTCHA/法律协议/密码即停并通知；`applytwin doctor` 做环境自检。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- 状态触发：登录即自启，所以 http://localhost:4747 一直在；岗位自动刷新；应用自动更新（手动为 `applytwin update` 或重跑安装行）。
- 定时：`applytwin watch --every 120`。
- 事件触发：填表过程遇到 CAPTCHA、法律协议、需要密码、遇到没见过的表单问题时中断并通知人工，人工答复后继续——这是“自动流程 + 人工检查点”的具体触发设计。
- 记忆型持续：同公司同岗位状态判断避免重复投递；Career Vault 作为长期状态，使每次改写都基于沉淀而不是每次重来。

**5. 效果验证（怎么判断确实改善了）**
原文给出的验证机制是“正确性护栏”而非“结果指标”：简历改写后的事实校验（新增数字/工具/断言即打回）、事实字段锁定不许改、单栏文本模板以保证 ATS 可读、去重避免重复投递、`apply.twinly.tech/app` 查看已同步的投递记录。README 没有给出任何结果侧指标（面试率、通过率、节省时间），这部分需要自己设计（见末节）。

## 与已有做法的关系

清单中有两个相关条目：
- **Claude Code（tool，adopt）**：ApplyTwin 不自己提供模型，而是直接跑在 Claude Code 或 Codex 订阅上（“不需要 API key，不加订阅”），是“把 Claude Code 当作可复用运行时”的一个应用层实例。
- **Agent skills（concept，adopt）**：仓库结构里 `skills/` 放 agent 技能、`playbooks/` 放各申请系统的操作手册、`AGENTS.md` 放 agent 指令、`docs/RESUME_GUIDE.md` 放简历写作规则——这是“agent skills + 分系统 playbook + 说明文档”这套做法在真实产品里的落地形态，可作为该概念的参照样板。

需要注意的边界：许可证为 PolyForm Strict，只允许非商业安装运行，不允许复制、修改、再分发或据以构建其他作品。也就是说，它的**代码不能拿来改用**，可复用的是**结构与做法**（上下文库、逐任务改写、事实校验、人工检查点、去重记忆、分系统 playbook）。

## 证据与局限

**原文给出的（README 自述）**：安装与排障命令、CLI 子命令清单、可复制的 agent 提示语、600+ 公司招聘页与列名的岗位源、8 个单栏模板、事实校验与“永不做的四件事”、凭据与验证码的默认关闭策略、遥测内容与关闭开关、数据存放路径、许可证条款。这些是**可核对的机制描述**，不是效果证据。

**只是作者主张、无数据支撑**：匹配分能挑出好岗位；“它懂你所在领域的强简历长什么样”（护理、金融、设计、研究、工程都算）；事实校验的实际拦截效果；去重的实际准确度。README 未给出任何用户量、成功率、误报率、节省时间的数据。仓库当前 53 stars，版权年份 2026，属于很新的项目，缺少第三方复现。

**适用条件**：
- 需已付费订阅 Claude Code 或 Codex；填表环节还需可被 agent 驱动的浏览器。
- 岗位源以英文环境为主（Greenhouse/Lever/Ashby/Workday/SmartRecruiters、The Muse、HN Who is hiring、社区实习追踪表），对非英语或本地化招聘渠道覆盖未提及。
- ATS playbook 依赖目标网站的表单结构，站点改版即可能失效；README 的贡献指引也在征集“哪个公司的哪套系统卡住了”。
- 许可证限制商用与改造。

**风险点（原文未强调，但材料本身足以看出）**：
- `curl … | bash` 从个人小仓库安装，未提供校验和或签名；不想承担风险就走 git clone 路径先审代码，或在虚拟机/容器里跑。
- Google 登录会把配置、答案、投递记录同步到账号（本地另有 `~/.applytwin`）；默认每天上报一次安装统计（随机 ID、OS、版本、所用 agent），需主动关闭。
- 开启自动提交后会产生大量低质量投递，既伤个人信誉，也可能违反招聘站条款；开启求职站账号创建与邮箱验证码读取，等于把凭据托管给本地应用。
- 不解 CAPTCHA、不接受法律协议意味着流程一定会停在人工处——这是设计，不是缺陷，但必须按“有检查点”的方式规划时间。

## 怎么试、怎么验证

**最小试用（建议 1 人 / 1–2 周 / 单岗位方向）**
1. 先建基线：手工完成 5 个投递，记录每个耗时（分钟）、改写简历耗时、填写字段数。
2. 用 git clone 路径安装（而非管道安装），或在隔离环境里跑；`APPLYTWIN_NO_TELEMETRY=1`；不开启自动提交、不开启求职站账号创建、不开启邮箱验证码。
3. `applytwin doctor` 通过后，导入历史投递 CSV，再 `applytwin scan` 与 `applytwin jobs`。
4. 挑 10 个岗位，逐个 `applytwin tailor JOB_ID`，并对其中 3 个用 `twin: tailor my resume for <job id or URL> and explain the choices` 看它给出的选择理由。
5. 挑 3–5 个岗位走完整填表，全程保持在复核页人工按 Submit。
6. 结束后写下“哪套申请系统卡住、卡在哪个字段”。

**判断有没有改善的指标**
- **事实准确性（一票否决）**：把每份定制简历与 Career Vault 原文逐项对照，新增数字/工具/断言数必须为 0；记录事实校验打回次数。出现任一处事实漂移即停用。
- **单份耗时**：定制 + 填表总分钟数，对照第 1 步基线；目标至少减半才有意义。
- **表单完成率**：N 个岗位里能一路填到复核页的比例，以及按 ATS 系统分类的卡点清单（这是最有迁移价值的信息——它告诉你哪类表单适合自动化、哪类不适合）。
- **岗位发现精度**：它给出的 top 20 里，你自己判断“本来也会投”的数量（例如 ≥ 8/20 才算有用），用来检验匹配分是否只是噪声。
- **去重正确性**：导入历史 CSV 后，重复投递次数必须为 0；抽查 5 条历史记录是否被正确识别。
- **下游结果（需更长周期，至少 4 周）**：同类岗位、同一时间窗内，面试邀请率与自己手工投递的基线对比；必须承认样本小、混淆因素多，只作方向性参考，不作结论。
- **停止条件（任一触发即终止试用）**：出现未按 Submit 的提交、简历事实被改动、凭据出现在模型可见上下文、收到招聘方关于重复/垃圾投递的投诉。

**如果不想用这个工具**：把它的结构照搬到自己的场景即可——一份集中式经历库（Career Vault 的等价物）、按单个任务生成并给出一页以内的产出、生成后加一道“不得引入新事实”的校验、默认停在人工复核、用日志去重、再配一份按目标系统分类的操作 playbook。这条路径不依赖该仓库，也不受其许可证限制。
