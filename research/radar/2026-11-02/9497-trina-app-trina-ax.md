# trina-app/trina-ax

- 结论：**值得一试**。先按 README 的 10 分钟本地 demo，用 alice/bob 双账号验证“按提问人逐次校验文件权限”是否成立；再挑一个低风险任务，照 examples/skills 里的 SKILL.md 结构写第一个团队 skill 小范围试。理由是它把“公司文件夹 + 团队 skill + 按人文件权限 + 统一 AI 连接”做成了有具体命令和首周清单的可部署流程，直接对应“条件供给”问题；但效果证据只有虚构公司的演示，且自托管不等于离线、运维方可读存储数据，够不上直接采用。
- 原文：https://github.com/trina-app/trina-ax
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T06:50:04.278Z

## 是什么

Trina AX 是自托管在公司服务器上的共享工作台：把真实的 Claude Code 和 Codex 智能体跑在一台公司服务器上，统一接上公司文件夹（`shared/`、`groups/`、`projects/`、个人目录）、团队 skills（一个 skill 就是一个 `SKILL.md` 文件），并按“提问的人”逐次校验文件权限。员工不用装终端，浏览器（桌面/手机）或 Windows 客户端就能用。

它解决的问题在 README 开头讲得很直白：空白文件夹里的 Claude Code 不知道你是谁，同一个“给 Trina Logistics 写一份提案”的请求，它会先反问六个关于公司、客户、格式的问题；而接上团队文件夹和 CEO 的 proposal skill 后，同一句话直接产出一份 7 页提案 deck（封面写“交期 2.1→1.4 天，在预算内”）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 先跑本地 demo 看权限模型**
前提：本机有 Git、Bun 1.3.12、Go 1.27+。demo 里 AI 是关闭的，不需要任何 AI 账号。
```sh
git clone https://github.com/trina-app/trina-ax.git && cd trina-ax
bun install --frozen-lockfile
bun run demo        # → http://127.0.0.1:19760 · sign in as alice / teamax-demo-1
```
然后开一个隐私窗口登 `bob`，对比两人看到的组文件夹不同。README 明确说这**不是生产安装**。

**2. 选部署形态**
四种：Trina 托管（AWS Seoul）、Linux 自托管、办公室 Mac、本地 demo。Linux 自托管的前提是：Debian 12/13 或 Ubuntu 24.04、systemd 带 cgroup v2、amd64 或 arm64、建议 4 GB 内存、最少 20 GB 磁盘；由 IT 负责安装、更新和恢复备份。Office Mac 走 Claude 不含 Codex。

**3. 按首周顺序配置（这一条本身就是可照做的清单）**
创建 owner 账号 → 配置权限 → 接 AI 连接 → 邀请团队 → 建第一个 skill → 首次备份。

**4. 把知识放进文件夹，而不是塞进提示词**
公司公共文件放 `shared/`，组内共享放 `groups/`，项目放 `projects/`，另有个人目录，都带版本历史。PDF、Office、HWP/HWPX 可抽文本。

**5. 把“我们怎么写这类东西”固化成 SKILL.md**
一个 skill 就是一个 `SKILL.md` 文件，例如提案写法放 `skills/proposal/SKILL.md`。README 给了六个可直接抄的起步 skill（虚构输入）：

| 角色 | 任务 | 可抄文件 |
|---|---|---|
| CEO / 团队负责人 | 周记 → 决策、风险、下一步 | `examples/skills/weekly-team-report/SKILL.md` |
| 销售 | 从会议记录起草跟进，不许编造承诺 | `examples/skills/sales-follow-up/SKILL.md` |
| 市场 | 从已批准的 brand notes 出 campaign brief | `examples/skills/brand-brief/SKILL.md` |
| 财务 | 标记缺发票和金额不确定项待复核 | `examples/skills/expense-review/SKILL.md` |
| HR | 只依据有权限的政策回答入职问题 | `examples/skills/new-hire-guide/SKILL.md` |
| 所有人 | 从会议记录抽决策与行动项 | `examples/skills/meeting-summary/SKILL.md` |

关键设定：skill 是“一组可复用的指令”，不是模型训练、也不额外赋权；AI 要改一个 skill 之前会先问人。

**6. 权限只按“提问的人”判**
服务器在 AI 每打开一个文件时，都以提问者身份校验。看不到的文件夹，在 Files、AI 回答、搜索、预览、版本历史和回收站里都不存在。子智能体用同一个人身份、走同一套检查、留同样的活动记录。

**7. 把入口收窄（IT/管理员侧）**
引擎自带的 shell 和文件工具被关掉，通往公司文件夹的唯一路径是 Trina 的文件工具，逐次调用逐次检查；每个引擎的这层收窄有回归测试覆盖。token 在浏览器里先封装再上送，引擎拿到的是每轮临时替身 token，由模型代理换成真 token。

**8. 亲手验证一次隔离**
照 README 的做法：用两个账号问同一个问题（示例是销售同事问“上季度营收多少”），确认答案在受限目录（示例是 `shared/Finance`）时，AI 回答“在我能访问的团队文件里没找到营收数字”，而不是给出数字。

**9. AI 连接与成本**
可以接公司的 Claude 或 OpenAI 账号一次，也可以让每人自连；按人计量并有额度上限。自托管时 Claude Code 还能经 Anthropic 兼容网关跑 DeepSeek、Kimi、GLM（`docs/CONFIGURATION.md#anthropic-compatible-gateway`，原文未给具体配置）。托管定价（2026-11-02 核查，税前美元）：Free 最多 3 人（名额有限）、Starter $39/月（5 人）、Team $69（15 人）、Business $129（40 人），40 人以上另报价；AI 用量另计。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文给出的“还没想到交给 AI”的候选，都是文档型工作：提案撰写、周报转决策/风险/下一步、销售跟进、campaign brief、报销初审、入职问答、会议纪要。前提条件被写明了——素材必须已经在公司文件夹里。空白工作区下模型会先反问六个问题，这说明卡的通常不是模型能力，而是上下文供给。

**2. 任务匹配**
跑的是真实 Claude Code / Codex：默认每次回答最多 150 轮工具调用、最多 4 个子智能体并发，带网页搜索和调度；入口是浏览器（桌面/手机）和 Windows 安装包，没有终端。角色到 skill 是一一对应的（见上表）。模型可替换：自托管时 Claude Code 可经兼容网关接 DeepSeek、Kimi、GLM。

**3. 条件供给（原文最厚的一块）**
- 信息：`shared/`、`groups/`、`projects/`、个人目录，带版本历史；PDF/Office/HWP 可抽文本。
- 工具：团队 skills 作为 `SKILL.md` 文件被“像文件一样治理”，谁能用由文件夹规则决定。
- 权限：每个文件调用都按提问人校验；子智能体同权限；引擎自带 shell/文件工具关闭，只留受检通道。
- 账号与额度：公司统一连接或每人自连，按人计量并设上限。
- 反馈：改 skill 前先问人；产出由人复核后再用。

**4. 主动推进**
只有一条线索：功能列表里提到 “schedules”（调度）和网页搜索，但原文没有给触发条件、状态机或持续运行的做法细节。这一项无法据此写成步骤。

**5. 效果验证**
原文给的是前后对比演示（空文件夹反问六问 vs. 直接出 7 页 deck），属于产品自述的 showcase；另外提到安全侧的入口收窄“每个引擎都有回归测试”。没有量化效果数据，也没有第三方评测。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：Trina 不替换它，而是把它托管成公司共享实例——关掉自带 shell/文件工具、改走受检文件工具，外面套一层公司文件夹 + 团队 skill + 按人权限。README 的 FAQ 直接点了差别：一个席位给的是“每人一个空工作区”，Trina 给的是“同一套公司文件夹和团队 skills 跑在一台服务器上”。对已有 Claude Code 用法而言，这是把“每次手工喂上下文”变成“上下文常驻在服务器”，属于可叠加的一层，不是替代。
- **DeepSeek（try）**：README 提到自托管时 Claude Code 可经 Anthropic 兼容网关跑 DeepSeek/Kimi/GLM，为低成本或国产模型接入提供了路径线索，但原文没有给出具体网关配置，只有文档锚点。
- **MCP**：初筛理由提到“接入 MCP”，但 README 正文没有展开 MCP 相关做法，清单中也没有 MCP 条目，因此无法据此判断。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给了具体数据/事实的**：10 分钟 demo 的命令、演示账号（`alice` / `teamax-demo-1`）、系统与硬件要求（Debian 12/13 或 Ubuntu 24.04、cgroup v2、4 GB 内存、20 GB 磁盘）；默认 150 轮工具调用、4 个子智能体；定价与核查日期；HWP 可视预览需 macOS 或 glibc 2.39+，因此 Debian 12 不支持；Linux 服务器不跑 OCR，扫描件和照片不可文本搜索。

**只是作者主张的**：“同一个请求出 7 页提案 deck”“新人的产出像他本人”这类对比，来自虚构公司 Dawnroute、日期为 2026-10-31 / 11-01，且 deck 配图由 Higgsfield 生成，没有对照组、没有量化指标、没有第三方复现。

**原文自己列的不承诺**：没有安全认证；不保证答案完美；不保证省钱；不做自动的法律、财务、HR 决定；产出需人工复核。

**适用条件与风险（原文明确说的）**：自托管不等于离线，请求所需上下文会发给你所连的 AI 提供商；每个 Codex 网页搜索会把此前对话发给 OpenAI 的搜索服务；选了 OpenRouter 做语音时，团队文件的音频会发给 OpenRouter 及其上游；服务器每 30 分钟向 `updates.trina.app` 询问自身公网地址（`MYCEL_EXIT_ADDRESS_CHECK=off` 可关）。运维方（托管时即 Trina）能读存储的文件和聊天，应用管理员看不到别人的私人会话。撤销文件夹权限不会抹掉此前已产生的回答。OS 隔离（专用引擎账号）只适用于 Linux 和角色账号 Mac 安装，Office Mac 以登录用户身份运行，本地 demo 无 OS 隔离。许可证 AGPL-3.0-only，若改版后通过网络提供服务需向用户提供源码。Claude Code / Codex 自身条款仍适用，本项目未获 Anthropic 或 OpenAI 背书。项目 60 星，安装包可能落后于源码。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（一周内可完成，不碰生产环境）**
1. 本地 demo 跑通，用 `alice` 与隐私窗口的 `bob` 双账号确认“看到不同组文件夹”。
2. 挑一个低风险任务（建议“会议纪要 → 决策与行动项”或“周记 → 决策/风险/下一步”），照 `examples/skills/` 里对应 `SKILL.md` 的结构写第一版，放在团队目录下。
3. 放一批真实但非敏感的文件进 `groups/` 某个子目录，只开给 2–3 人。
4. 接公司 Claude 或 OpenAI 账号（先确认授权条款允许这样共享），或先让人自连个人账号；设按人用量上限。
5. 若要自托管，先在非生产机按 `docs/INSTALL-LINUX.en.md` 装一遍，专门确认 HWP 预览在 Debian 12 不可用这类坑。

**判断有没有改善的指标**
- 权限是否真的成立：用一个无权限账号，问一个答案落在受限目录里的问题，看 AI 是否“找不到”；同时核对活动记录里 AI 读了哪些文件（而不是看聊天内容，管理员本来就看不到）。
- 输出质量：同一 prompt 在“空工作区”和“Trina 工作区”各跑一次，人工盲评三项——是否符合公司模板、是否有编造承诺、需要返工几轮。
- 交互成本：从提问到可用草稿的轮数、人工修改时长、AI 反问次数（对照原文里“空文件夹先反问六个问题”的基线）。
- 采用度：第一周清单（权限 → AI 连接 → 邀请 → 第一个 skill → 备份）是否全部完成；各 skill 的使用人数与复用次数。
- 停止条件：出现越权读取、产出需要大改、或运维方无法满足数据合规要求时，退回单人本地使用，不强行上线。
