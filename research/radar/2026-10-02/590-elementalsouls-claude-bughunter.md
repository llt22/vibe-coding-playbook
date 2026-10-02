# elementalsouls/Claude-BugHunter

- 结论：**值得一试**。在已获授权的漏洞挖掘/外部红队场景中，按 README 的插件方式小范围装这套技能包，用 `/hunt` 跑一个自建靶场并按 7-Question Gate 校验产出；它把「技能包分层 + 按主题自动加载 + 阶段化流程 + 提交前闸门 + 证据脱敏」这套可复制的工作流给全了（含可照抄的安装命令和多 harness 目录映射），但仅凭 README 无法验证 83 个技能的实际质量，且覆盖范围被明确限定在外部攻击面。
- 原文：https://github.com/elementalsouls/Claude-BugHunter
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T08:28:02.694Z

## 是什么

claude-bughunter 是一个面向漏洞挖掘与外部红队（external red-team）的 Claude Code 技能包（skill bundle）。按 README 自述，它含 **83 个技能、15 个 slash 命令、681 条已披露报告模式（其中 433 条单独引用、可审计）**，覆盖 24 类核心漏洞，另含企业身份与基础设施攻击矩阵、engagement 目录脚手架、Burp MCP 集成；作者自述在授权红队与漏洞赏金 engagement、以及 DVWA / OWASP Juice Shop / Hacker101 / testphp.vulnweb.com 等公开练习平台上打磨过。

它把能力叠成四层：

- **Think**：`bb-methodology` + `redteam-mindset`（非线性工作流、批判性思维框架、红队纪律）
- **Hunt webapps**：58 个 `hunt-*` 技能，从 681 篇 HackerOne 披露报告整理出每类的检测模式、payload、绕过表、链式模板
- **Hit the perimeter**：企业平台链（M365/Entra、Okta、vCenter、SSL-VPN 设备、SharePoint、云 IAM），2024–2026 CVE 链 + 拿到凭证后的提权
- **Ship it**：`triage-validation` + 报告 + `evidence-hygiene`（7-Question Gate、VRT-aware 严重度、OOS 反驳、PII 脱敏、红队交付物）

关键机制：**技能按主题自动加载，不用按名字调用**——用自然语言描述你在测什么，相关技能自动载入。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 前提**：已装 Claude Code；只对你自己拥有、或有书面授权评估的资产使用（README 的授权条款：赏金项目 in-scope 资产、渗透测试授权书、CTF、自有基础设施）。可选：Burp Suite + MCP Server 扩展。

**2. 方式 A（推荐）——作为 Claude Code 插件安装**。在 Claude Code 内执行：

```text
/plugin marketplace add elementalsouls/Claude-BugHunter
/plugin install claude-bughunter@elementalsouls
```

结果：83 个技能 + 15 个命令以 `claude-bughunter:` 命名空间加载，bump 插件版本即更新，不往 `~/.claude/` 拷任何文件。**注意**：此路径不含 `hunt` engagement 脚手架（脚手架只在 clone 里）；`cbh` CLI 需另行 pipx 安装。

**3. 方式 B——拷贝安装（没有插件系统，或想钉住某个 clone 时）**：

```bash
git clone https://github.com/elementalsouls/Claude-BugHunter.git
cd Claude-BugHunter
```

```bash
# macOS / Linux
bash scripts/install.sh

# Windows (PowerShell)
pwsh ./scripts/install.ps1
```

把技能 + 命令拷进 `~/.claude/`（Windows 为 `%USERPROFILE%\.claude\`）并接好 `hunt` engagement 脚手架。三条路径的差别按 README 的表：

| 路径 | 83 skills + 15 slash commands | `cbh` CLI | `hunt` scaffolder |
|---|---|---|---|
| A — plugin | ✅ 命名空间 `claude-bughunter:` | ➕ 需单独 `pipx install` | ❌ 仅 clone 有 |
| B — copy install | ✅ 拷进 `~/.claude/` | ✅ 来自 clone | ✅ 来自 clone |

**4. 多 harness 一次装全**（前提：技能是标准 Agent Skills `SKILL.md` 格式，README 称 Claude Code / OpenCode / Codex CLI / Hermes / AntiGravity 都能读）：

```bash
# macOS / Linux
bash scripts/install.sh --all --burp-mcp

# Windows (PowerShell)
pwsh ./scripts/install.ps1 -All -BurpMcp
```

`--all` 自动探测已装的 harness 并分别拷贝；`--burp-mcp` 给每个 harness 接上 Burp MCP server。目标目录对应关系：

| Harness | 技能目录 | 开关 |
|---|---|---|
| Claude Code（基线） | `~/.claude/skills/` | 默认 |
| OpenCode | 读 `~/.claude/skills/` 与 `~/.agents/skills/` | 默认 / `--agents` |
| OpenAI Codex CLI | `~/.agents/skills/` | `--agents` |
| Hermes Agent | `~/.hermes/skills/` | `--hermes` |
| Google AntiGravity | `~/.gemini/config/skills/` | `--antigravity` |

**边界**：知识层（技能）可移植到全部五个 harness；**slash 命令与 `/hunt` 引擎按设计只在 Claude Code 可用**。

**5. 装 `cbh` CLI（终端原生 runner，编排 recon + classify + triage + report）**：

```bash
pipx install git+https://github.com/elementalsouls/Claude-BugHunter
```

**6. 开一个 engagement**：用 `/hunt` 建 engagement 目录结构、状态与编排。注意 README 强调 `/hunt` 会在**第一轮就声明 engagement 背景**（已授权、scope 限定、可修复的发现），因为 Anthropic 的实时网络防护会拦这类请求。随后按 README 自述的 6 阶段非线性流程走——原文列出的阶段名是 `recon → map & rank → hunt → validate → report`（原文如此，列了 5 个名字却称 6 阶段，使用前以仓库内 `docs/architecture.md` 为准）；**scope 由代码强制**。

**7. 日常用法**：自然语言描述目标，技能自动加载。README 给的示例（作者自己标注为*示意 transcript，非真实录制*）：

```text
> Testing acme.com — an in-scope HackerOne target. Run recon and rank the surface.
```

示例输出为：加载 `web2-recon`、`offensive-osint`、`bb-methodology` → subfinder + crt.sh 子域枚举（47 个 host）→ httpx 存活与指纹（12 个存活、6 种栈）→ 排序后的攻击面（`api.acme.com` GraphQL introspection 开着，建议先打；`auth.acme.com` OAuth/SSO 建议用 `hunt-oauth`），并主动问下一步是否要探 introspection + OAuth redirect_uri。

**8. 提交前过闸门**：`triage-validation` 的 **7-Question Gate** 必须在提交任何东西之前过——其中 Q3 问资产是否在 scope 内，Q2 问是否在项目认可的 impact 列表内。证据按 `evidence-hygiene` 脱敏（README 点名的问题是截图泄露 cookie 与受害者 PII）。报告按平台分流：H1、Bugcrowd（VRT-aware）、Intigriti、Immunefi，以及客户侧红队交付格式（50KB+ MD + DOCX 带内嵌截图）。

**9. 授权与运行时注意事项**：若做授权的攻击性安全工作（渗透/赏金/红队），按 README 指引申请 Anthropic 免费的 **Cyber Verification Program（CVP）**，以获得针对合法双用途工作的策略调整；**不要把攻击性 engagement 改写成“防御性”措辞去绕分类器**。另有一条容易忽略的现象：Opus 5 对 exploit generation、binary-based vulnerability scanning、penetration testing 一类更高风险请求会**回落到 Opus 4.8** 而非拒绝，长 agentic 运行中会滚动过去、看起来像“Opus 5 悄悄变差”；若只是不想要自动切换，可在 Settings → Capabilities 关掉。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 的整个卖点就是“装对技能后 Claude 不再是聊天机器人，而是操作员”。能力清单覆盖 recon/OSINT（子域枚举、身份面测绘、证书透明日志、JS 分析、密钥扫描）、58 类 Web/API 漏洞（XSS、SQLi、SSRF、IDOR、LFI、SSTI、XXE、CSRF、CORS、开放重定向、SharePoint、ASP.NET/NTLM）、企业平台链、云配置错误与凭证后提权、报告撰写。可提炼的发现路径是：**不靠逐个提示词试探“你能做什么”，而是把成体系的方法论文档挂成技能库，等主题触发**。
- **任务匹配**：技能**按主题自动加载，无需按名调用**；harness 分工清楚——知识层（SKILL.md）五家通用，编排与 slash 命令只在 Claude Code。模型层面 README 记录了真实约束：高风险网络请求会触发模型回落（Opus 5 → Opus 4.8），以及默认防护会拦“漏洞利用或攻击性安全工具开发”，即便工作已授权、in-scope。也就是说：**这类任务的匹配不只看能力，还看平台策略路由**。
- **条件供给**：需要装（插件或拷进 skills 目录）、可选接 Burp MCP、外部工具链（Burp Suite + MCP 扩展；ProjectDiscovery 的 subfinder/dnsx/httpx/katana/nuclei；SecLists、Assetnote 字典）、engagement 目录与状态（`/hunt` + `cbh`）、以及**显式供给授权背景**（`/hunt` 第一轮声明授权/scope/可修复性）。scope 由代码强制。
- **主动推进**：有确定性 engagement engine（`engine/`）——把目标攻击面映射后，把每条 finding 路由到处理它的技能；`cbh` CLI 编排 recon + classify + triage + report；`docs/cve-coverage.md` 的 CISA KEV 覆盖快照按周用 `docs/automation/cve-refresh.yml.template` 刷新；star history 每日自动刷新。**注意路线图**：per-engagement memory（跨目标模式召回）、program-rules-parser（从项目文本自动生成结构化 `scope.md`）、HackerOne MCP 都是未勾选项，不能当现有能力用。
- **效果验证**：产出前有 7-Question Gate、triage-validation、VRT-aware 严重度、OOS 反驳、evidence-hygiene 组成的一道校验闸门。但 README **没有给改善幅度数据**（没有时间节省、误报率、有效率的前后对比），只有两次 engagement 暴露的能力缺口清单。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：本包是 Claude Code 技能/插件体系上的一个具体实现；方式 A 的 `/plugin marketplace add` + `/plugin install` 就是该插件机制的标准用法。
- **Agent skills（adopt）**：本包用标准 `SKILL.md` 格式，并声称一次安装可分发到五个 harness，是这条概念条目在安全领域的一个实例，可作为“技能层与 harness 层解耦”的参考样本。
- **OpenAI Codex（adopt）、OpenCode（watch）、Hermes（watch）、Google Antigravity（watch）**：README 明确给出各自的技能目录与安装开关，等于示范了如何让同一套知识资产覆盖这些还处于 watch 状态的工具。
- **Atlas（watch）**：README 中 Atlas Cloud 是**赞助商推广位**，与这套技能的功能无因果关系，不构成采用依据。
- **清单中没有相关条目**：7-Question Gate、engagement 脚手架与状态管理、evidence-hygiene（证据脱敏）这三项在现有清单里没有对应条目，可作为新增候选。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的量化自述**（均为作者自述或仓库元数据，未经第三方核验）：83 个技能、15 个 slash 命令、681 条披露报告模式（433 条可审计）、24 类核心漏洞、58 个 `hunt-*`、10 个企业平台技能、6 个报告与校验技能、5 个 recon/OSINT 技能、4 个方法论技能；43 个原创 + 8 个 vendored；仓库 star 数约 4.7k。

**唯一带情境的案例**是两次授权 engagement 暴露的缺口清单（属作者经验叙述，无前后对比指标）：

- 漏洞赏金侧：没验证就写稿 → 浪费工时、拉低 validity ratio；按 VRT 默认把本该 P3 的发现自动降成 P4；findings、证据、提交 ID 散落在各文件夹；截图泄露 cookie 与受害者 PII。
- 外部红队侧：WAPT 心态在防御良好的目标上过早停手，错过本可继续挖的绕过链；缺中期态势感知（客户 SOC 30 分钟内修掉已确认 SQLi；外部攻击者在一场实时测试中锁了 14 个账号，两者无显式检测方法就看不见）；缺企业平台链（一次 engagement 用到 M365 + Entra、本地 SharePoint、Cisco SSL VPN、vCenter、7 个 Android APK）；bug bounty 报告模板不适配客户侧交付物；recon 拿到凭证（AWS key、JWT、GCP JSON）却不知道其权限和提权路径。

**明确自承的局限**：只覆盖外部攻击面。内部 AD 攻击（BloodHound、Kerberoasting、DCSync、AD CS、ntlmrelayx、Responder、PetitPotam）、C2 框架、后渗透/持久化/横向、免杀（AMSI/ETW/EDR 绕过）、iOS/硬件/RF/ICS、二进制/内核/浏览器内部，**一律不在范围内**；README 直说内部红队做 Kerberos 域接管和横向移动时“这个包帮不上忙”。

**使用条件**：仅限自有或书面授权资产；Anthropic 实时防护可能对已授权的攻击性工作也拒绝，需要申请 CVP；可能出现模型回落。

**本次材料本身的局限**：输入只有 README，`docs/skills.md`、`USAGE.md`、`docs/architecture.md`、`engine/` 和各技能文件都未提供，因此**无法验证技能内容质量、7-Question Gate 的具体问题清单、engine 的路由实现**，也无法验证“battle-tested”的说法。README 里的命令行示例被作者自己标注为示意 transcript、不是真实录制。README 含赞助商板块与商业推广，整体属自述性宣传文本。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约半天）**：

1. 选一个 README 自己点名的合法练习目标（DVWA、OWASP Juice Shop、Hacker101、testphp.vulnweb.com）或你自己的靶场/仓库，先确认授权范围。
2. 用方式 A 装插件，用 `/hunt` 建 engagement 目录。
3. 同一目标跑两轮对照：**对照组**用裸 Claude Code + 一句通用安全提示；**实验组**用技能包，自然语言描述目标。两轮都只做到 recon + 攻击面排序 + 一个漏洞类的验证，别扩大范围。
4. 记录并对比这些量：
   - 从开始到得出“排序后的攻击面”的耗时，以及漏掉的服务/入口数
   - 提出的假设数 → 验证通过的发现数（有效率）
   - 提交前通过 7-Question Gate 的比例
   - OOS 提交数、证据 PII 泄露事故数（目标都是 0）
   - 被安全策略拒绝的次数、模型回落的次数

**判断有改善的信号**：同等时间下有效发现更多，或同量发现耗时更短；不再出现“未验证就写稿”；报告因严重度误判被降级的次数下降；截图与证据零 PII 泄露。

**判断应退级的信号**：两轮产出无实质差异；技能自动加载频繁误触发；频繁撞上安全拒绝或模型回落导致流程断掉。若出现这些情况，退回 **study**——只借鉴“技能包分层 + 按主题自动加载 + 提交前闸门 + 证据脱敏”这套结构，不必整体采用这个具体仓库。
