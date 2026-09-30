扫描完成。以下是交付物。

---

# AI Tool Radar — 扫描报告

**窗口**：2026-08-24 → 2026-09-23（当期信号）；2026-06-01 → 2026-08-23（历史回捞）
**主题**：面向开发者的 AI / Agent 工具（编码 Agent、harness、skill、MCP、Agent 记忆、Agent 基础设施、评测）
**性质**：只读调研。未安装、未 clone、未认证任何服务。

---

## 一、这一窗口真正发生了什么

三条主线，按证据强度排序：

1. **决策模型（"Jev 类"）成为新的模型品类** —— 9/15 TypeSafe 发布 Jev 后 8 天内形成了完整的开源生态（权重、运行时、benchmark、CLI 插件、浏览器 Agent）。这是窗口内唯一"由一个新模型品类在两周内长出生态"的事件。
2. **Agent 供应链安全从理论变成实锤** —— ZCode 静默上传整个 git 历史并被 4 个独立方复现；Plugin4Shell 零点击 RCE 影响全部四家主流编码 Agent；MCP 官方注册表内 155 个可劫持条目。
3. **"skill 通胀"被独立测量证伪** —— 最热门的 skill（ponytail，144.5k star）被证实约等于一句 "Follow YAGNI principles"，官方宣称 −54% 代码，独立 A/B 实测 −15% 代码 / −10.3% 成本。

---

## 二、分级短名单

### Try now

| # | 项目 | 关键证据 | 边界 |
|---|---|---|---|
| 1 | **[TypeSafe Jev / System One Models](https://typesafe.ai/blog/introducing-system-one-models-and-jev)** (2026-09-15) | HN 1969 分 / 511 评论；[Simon Willison 独立分析 09-21](https://simonwillison.net/2026/Sep/21/jev/) 确认 API 形态与 $0.042/MTok 定价；第三方工具已落地（[llm-typesafe](https://github.com/simonw/llm-typesafe)、[JevBench](https://benchmarkheaven.com/jev-models)、[awesome-jev](https://github.com/Amal-David/awesome-jev)） | 闭源 API、early access 排队。**决策模型返回浮点数无解释，偏见不可审计** |
| 2 | **[Laya](https://github.com/NandhaKishorM/laya)** (2026-09-18) | Apache-2.0；17,293 star；HF 权重 + PyPI + [MLX 原生端口](https://github.com/mizorewww/laya-mlx)（5,554 star）；README 自述对标 Jev 的 51 语言 / 延迟数据，并附第三方独立测量（[jev-benchmarks](https://github.com/AbdelStark/jev-benchmarks)、[nibzard](https://github.com/nibzard/decision-model-benchmark)） | 自托管需 GPU；作者自述的对比数字含自评偏差 |
| 3 | **[Kev](https://github.com/jaredpalmer/kev)** (2026-09-17) | Apache-2.0；4,548 star；HN 453 分 / 199 评论；基于 Qwen3.5 的 0.8B/4B/9B 可自训 | 需自行训练；成熟度早期 |
| 4 | **[i-have-adhd](https://github.com/ayghri/i-have-adhd)** (2026-05-13 建，窗口内爆发) | MIT；50,370 star；HN 09-08 542 分 / 371 评论；多 harness 插件格式（Claude/Codex/Cursor/opencode） | 纯 skill、零凭证；效果类同 ponytail，见下方独立测量 |
| 5 | **[google/ax](https://github.com/google/ax)** (2026-03-30 建，09-20 爆发) | Apache-2.0；7,843 star；HN 657 分 / 297 评论；K8s 原生、Task/Workspace/Gateway/Model 四原语 | README 自述 **"stable release 前会有重大破坏性变更"**。Study 亦可 |

### Study —— 架构或产品思路有价值，但尚不可依赖

- **[Unreal Agent](https://github.com/unreallabsai/unreal-agent)**（2026-09-21）—— 异步工具调用 harness，宣称较 Codex 省 40% 成本。**benchmark 有 Harbor job ID 可复现**（Terminal-Bench 4.0 / SWE-Atlas / DeepSWE / ALE-CLI 全表），这是本窗口内 benchmark 透明度最高的一家。1,095 star、MIT、Go SDK。
- **[HarnessTax](https://harnesstax.github.io/)**（2026-09-16）—— 21 组 model×harness 配对评测。HN 231 分 / 95 评论，结论"harness 很重要但差异被高估"引发大量一线反驳与佐证（含 `lucumr` 的"新模型更会用原生工具"论点）。**是本窗口 harness 经济学的最佳参考基准。**
- **[Headlong](https://github.com/laude-institute/headlong)**（Laude/MIT，08-24）—— 10K 行 Bash 的"持续思考"microharness，附带轨迹 DAG 与指数衰减压缩算法。**作者自己列出失败清单并声明 alpha，要求沙箱 + 限额 key。**
- **[JetBrains Air](https://blog.jetbrains.com/blog/2026/09/22/introducing-jetbrains-air/)**（09-22）—— 单一产品转向多厂商 Agent 治理系统；配套 ACP Registry。暂不可独立验证，但标志着 IDE 厂商对 harness 中立化的下注。
- **[txcript / Skillsync](https://github.com/skillsynchq/txcript)**（YC W26）—— 跨 harness 会话格式转换；136 star 但 Launch HN 66 分 / 59 评论。**供应商锁定的逃生舱口**，方向价值高于当前成熟度。
- **[ripwire](https://github.com/redhat-et/ripwire)**（Red Hat ET，2,316 star）—— 披露了反例与失败下限；但 HN 09-07 的 19 分帖被集中批评 "README 明显是 vibecoded slop"，且安装方式为 `curl | bash`。
- **[Autoharness](https://github.com/tigerless-labs/autoharness)**（4,434 star）—— 自学习 skill 层，采用"后续轮次遵循度"而非留出基准作为验证信号。**hook 匹配全部工具调用，且能 fork/resume 刚结束的会话。**

### Watch —— 太早、验证不足或变化太快

- **[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)**（08-13，恢复期）—— **233,652 star**、issues 关闭、"everything is a plugin"。HN 747 分 / 314 评论。当前排行榜已不展示，属典型回捞项。
- **[openworker](https://github.com/andrewyng/openworker)**（18,148 star，504 open issues）、**[qm](https://github.com/yc-software/qm)**（15,210 star）、**[OpenWiki](https://github.com/langchain-ai/openwiki)**（16,727 star，HN 96 分）、**[Omnigent](https://github.com/omnigent-ai/omnigent)**（10,169 star，**HN 讨论仅 15 分**）、**[prime-agent](https://github.com/PrimeIntellect-ai/prime-agent)**（21,191 star，HN 254 分，作者自述存在 reward hacking）。
- **[headcount](https://github.com/cbrock84/headcount)**（08-28，1,651 star）—— 167 个 skill 的"公司组织结构"。**skills.sh 显示全仓仅 1.3K 安装、单个 skill 最多 15 次：广而浅。**
- **[skill-recorder](https://github.com/microsoft/skill-recorder)**（Microsoft）—— 把屏幕录制转成 SKILL.md。**捕获面包含屏幕视频 + 窗口标题 + 浏览器 URL + 剪贴板 + 完整终端记录（含命令/cwd/退出码/无限输出），点 Analyze 后上传 GitHub 云。**
- **[okf-agent-memory](https://github.com/okf-memory/okf-agent-memory)**（717 star）、**[Graft](https://github.com/trailhq/Graft)**（9,041 star，第三方评审拒绝其 4x 成本宣称）、**[abide](https://github.com/coldteadotai/abide)**（**每次编辑都把变更行发给第三方决策模型**）。
- MCP 注册表窗口内新条目：`ac.snag/snag`(09-09)、`ai.arsentev/contextburn`(09-11)、`ai.codenib/codenib`(09-03)、`ai.arclan/registry`(09-12)。

### Avoid for now

| 项目 | 原因 |
|---|---|
| **[ZCode](https://zcode.z.ai)** (Z.ai) | 登录状态下静默打包整个工作区（86.6% 是 `.git`）上传阿里云 OSS，密钥仅服务端持有；UI 开关为死代码；已由 4 方独立复现。09-21 开源但**仅有 2 个 commit、历史被完全压平、PR 锁定、Issues 关闭**，上传管道被剥离，因此无法 diff 验证。 |
| **higgsfield-generate** ([skills.sh](https://www.skills.sh/higgsfield-ai/skills/higgsfield-generate)) | 独立审计 **Gen Agent Trust Hub: Fail / Snyk: Fail**，风险 HIGH（`curl \| sh` 远程代码执行、命令执行、间接提示注入）。**177.2K 安装量**。 |
| **codex-with-chatgpt / codex-chatgpt-web** | 通过 Cloudflare 隧道暴露工作区，且安装说明要求**由 Agent 自行执行安装**。 |
| **teamclaude / claude-max-api-proxy** | 池化订阅账号、MITM 拦截 `api.anthropic.com`；厂商条款明确禁止订阅 OAuth 用于第三方工具。 |
| **camofox-browser / pydoll-cf-waf-bypasser-skills / mcp-stealth-chrome** | 核心功能为绕过 Cloudflare Turnstile / 反爬 / 指纹检测——**依赖绕过他方控制的服务**。 |
| **Local MCP (LMCP)** | 签名安装器会**自动改写所有已检测 MCP 客户端的配置**；终端安装为 `curl \| bash` / `irm \| iex`；license NOASSERTION 且仓库内无源码。 |
| **gologin-mcp** | 把 cookie 读写、指纹控制、代理轮换、工作区成员权限变更、创建 dev token 一并交给 Agent，共 59 个工具。 |
| **Nilyo** (mcp.so) | 账号级 LinkedIn/WhatsApp/Instagram/Telegram/邮件发送能力；`imap_connect` 接受在对话中直接粘贴原始邮箱凭据。 |

---

## 三、安全与信任边界（本窗口最重要的一组证据）

**分发层 —— 一个反复出现的设计缺陷**：控制点检查指针/声明/展开前字符串，而真正执行的东西由另一个组件在之后解析。

- **Plugin4Shell**（[Air Security，09-17](https://www.air.security/blog-posts/plugin4shell)）—— 零点击 RCE，影响 Claude Code / Codex / Copilot / Gemini CLI。Agent 只 checkout 被 pin 的 SHA，**从不校验实际落到了那个 commit**；攻击者把默认分支命名为该 40 位 SHA，git 优先解析 ref。修复：Claude Code 2.1.179 已修、Codex 0.146.0 已修、**Copilot 未修、Gemini CLI 明确不修（已废弃，用户被建议迁移 Antigravity）**。GitHub 官方反驳称其拒绝 SHA 形分支名故不可利用；Air 反指出 Bitbucket 与自托管 git 仍受影响——**这是本窗口唯一真正的公开争执**。
- **MCP `instructions` 字段提示注入**（[webofmike，09-11](https://webofmike.com/mcp-discovery-prompt-injection/) + [协议自身 issue #3213](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3213) 仍 OPEN）—— 8,235 个在线注册表服务器中 **5,462 个（66%）**发送该字段，最长 68,669 字符；`cacheScope:public` 可让共享代理把注入内容发给从未连接过的调用方。工具定义的内容哈希 pinning **不覆盖该字段**。
- **MCPJacking** 155 个可劫持 MCP（过期域名被注册）、**SkillJacking** 925 个 skill / 134K Agent、**RepoJacking** 178 skill / 23,812 Agent —— 受害者**无需更新任何东西**，只要再用一次该 skill。
- **八个开源 skill 扫描器全部可绕过**；同时注意反向证据：**七个扫描器中六个把 8.6%–62.4% 的合法 skill 判为问题**，无一超过"全部标记"的 F1 基线。采购时两边都要看。

**客户端层 —— opting out 不等于 egress control**

- **Grok Build**（07-14，恢复期参照）：cereblab 线级审计记录 **5.10 GiB 上传 vs 192 KB 模型往返流量（约 27,800×）**；xAI 的修复是**服务端静默全局 flag**，而非用户可验证的控制。
- **Claude Code** 三个未修复项：`DISABLE_TELEMETRY=0` 被当作真值**反而开启**（[#89386](https://github.com/anthropics/claude-code/issues/89386)）；`--permission-mode auto` 下约 1/3 计费请求无遥测事件（[#86375](https://github.com/anthropics/claude-code/issues/86375)，266,682 token 缺口）；**Remote Control 由服务端 GrowthBook flag 在未选择的安装上启用**（[#89752](https://github.com/anthropics/claude-code/issues/89752)）。
- **浏览器 Agent 单一栽培**：**BragJack** —— 一个普通扩展即可劫持 Chrome/Gemini Live、Perplexity Comet、Edge Actions、Opera Neon 与 Claude for Chrome 的内置 Agent，零点击。

**凭据层**：多种信息窃取器已加入对 `.claude/`、`.cursor/`、`.codex/`、`.gemini/`、`.vscode/` 本地状态的显式收集规则（token、含明文 API key 的 MCP 配置、会话数据库）。注意 `.claude/`、`.cursor/`、`.vscode/` 通过 SessionStart hook / `alwaysApply` / `folderOpen` 任务**已成为可执行面**。

---

## 四、这一窗口暴露出的发现规律

- **skills.sh 事实上已是 skill 注册表**，且是唯一能在一页上同时给出 **First Seen 日期**与三方审计结论（Socket / Snyk / Gen Agent Trust Hub）的目录。它的 **Hot（1 小时安装增量）**是最快的移动信号。
- **非 GitHub 来源正成为一等发布方** —— `open.feishu.cn`（22+ skill、1,650 万次安装）、`uizze.sh`、`larksuite/cli` 都无法通过浏览 GitHub topic 找到。注意 skills.sh 仓库页显示 headcount 167 个 skill 而仓库徽章显示 172 个——**单一数字不可采信**。
- **注册表噪音快速上升**：单个 `updated_since` 窗口内就出现整族自动生成的服务器条目。**注册表存在 ≠ 有策展。** PulseMCP 已暂停提交、Glama 无日期过滤。
- **下一波信号是验证、溯源与成本，而不是更多人格化 prompt** —— 本窗口最强的新信号分别是测量目录（agentmods.dev）、安全评级目录（skillsdirectory.com）、证明/存证层（tomevault）与 token 成本仪表（contextburn）。
- **Star 数只能当发现信号**：ponytail 144.5k star 对应约 100 行 markdown；northcinder 1,212 star / 11 fork 的比值异常。

---

## 五、未能核实的渠道与不确定性

**被阻断 / 不可枚举**：Reddit 原生 API 全部 403（改经 Redlib 实例）；X/Twitter 需登录（Z.ai 官方声明经 Nitter 镜像读取）；linux.do 所有路径 403；项目 Discord 未接入；V2EX 该帖 403 且热榜无相关主题；Smithery JS 门控无法列举；Glama 各类排序返回同一份无日期 Atom feed。

**证据等级说明**：
- 我**亲自核验**：ZCode 事故链（ferstar 原文 + tokenstead + HN）、Jev（TypeSafe 原文 + Simon Willison）、Laya/jev-ultrafast/google-ax README 与 API 元数据、Unreal Agent benchmark、Plugin4Shell 原文、MCP 争议帖（HN 328 评论）、ponytail 的 Scott Logic 批评与 JetBrains 80 组配对 A/B、higgsfield 的审计结论、skills.sh 榜面。
- 由**子 Agent 提供、我未二次独立核实**：MCPJacking/SkillJacking/RepoJacking 具体数字、信息窃取器通告、Claude Code issue 编号与内容、BragJack、Deadbugz、ZCode 的三个复现博客（vonng / silencestar / NodeSeek）、headcount 与 abide 的采纳证据。
- **本扫描不穷尽**：数千条窗口内目录条目中深查 18 个，另有约 60 个候选做过元数据核验。

---

**下一步建议**（如需要，我可以继续执行，但按技能约定不擅自安装）：优先在隔离环境复现 Laya 自托管延迟与 Kev 训练流程；对已在用的 harness 做一次出网审计（`.claude/`、`.codex/` 配置与 SessionStart hook）；把 Plugin4Shell 的修复版本号加入依赖清单。