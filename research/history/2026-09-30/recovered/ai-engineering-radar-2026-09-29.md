# AI Engineering & Harness Radar — 2026-09-29

检索窗口：2026-02 至 2026-09-29。信源：X（ego-browser 登录态检索，参与度门槛 20–50）、一方工程博客、arXiv/COLM 论文、GitHub 实物仓库、厂商规范文档。
每条结论均可指回 permalink。数字均标注口径与时间窗。未核验项单独列出。

---

## 0. 本期主轴（一句话）

**"Harness Engineering" 已从个人实践词变成有预算、有组织、有基础设施的工程学科**：一方实验室（OpenAI/Anthropic）给出可复用的 harness 组件清单；一线大厂（Uber/DoorDash/Alibaba）给出带口径的规模化数字；Martin Fowler/ThoughtWorks 把它抽象成"前馈 guide + 反馈 sensor"的控制论模型并写进雷达；与此同时，**反方证据同期到位**（Horthy 的"软件工厂失败论"、Faros AI 的 22K 开发者遥测、SandboxGym 的沙箱逃逸审计），指向同一结论：**瓶颈已从"生成代码"迁移到"环境与验证"**。

---

## 1. 流程编排与 Harness 架构（维度 1）

### 1.1 OpenAI《Harness engineering: leveraging Codex in an agent-first world》

- **定位**：OpenAI，Ryan Lopopolo（MTS），**2026-02-11**。permalink: https://openai.com/index/harness-engineering/ （直取 403，经 https://web.archive.org/web/20260924171239/https://openai.com/index/harness-engineering/ 核实）
- **核心命题**：仓库本身是 agent 的系统记录（system of record），"Humans steer. Agents execute."；"give Codex a map, not a 1,000-page instruction manual."
- **数字（口径：内部 5 个月实验）**：约 100 万行代码、**约 1,500 个 PR、3 名工程师 → 3.5 PR/人/日**；后扩到 7 人，吞吐"增加"；"约 1/10 的时间"；单个 Codex 任务可连续跑 **6 小时以上**。
- **关键机制**：
  - `AGENTS.md` 约 100 行，作为 `docs/` 目录的**目录页**（渐进式披露）；`exec-plans/active|completed` 把执行计划升为一等资产；`tech-debt-tracker.md`、`generated/db-schema.md`。
  - **自定义 linter + 结构测试强制分层**：Types → Config → Repo → Service → Runtime → UI，跨层只能经 Providers；lint 报错文本内嵌修复指令（"正向的 prompt injection"）。
  - **每个 git worktree 可启动一个 app 实例 + 临时可观测栈**（Vector → VictoriaLogs/Metrics/Traces，LogQL/PromQL/TraceQL 可查）；Chrome DevTools Protocol 接入 agent runtime 做 DOM 快照/截图。
  - agent-to-agent review loop（作者自称"effectively this is a Ralph Wiggum Loop"）；doc-gardening agent 开修复 PR。
- **自曝失效**：单一超大 AGENTS.md 必然失败（上下文稀缺、"too much guidance becomes non-guidance"、会腐化）；曾被"每周五（20% 工时）清理 AI slop"。

### 1.2 Anthropic 两代 harness 设计（可复制的组件清单）

**(a) Effective harnesses for long-running agents** — Justin Young，**2025-11-26**，https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- 核心痛点："each new session begins with no memory of what came before"；"**Compaction isn't sufficient**"。
- 机制：**initializer agent + coding agent 双 agent 拆分**；`feature_list.json`（200+ 功能，全部 `"passes": false`，**只允许改 passes 字段**，选 JSON 而非 Markdown 因"模型更不容易乱改 JSON"）；`claude-progress.txt` + git commit 交接；`init.sh` 冷启动；**验证必须走浏览器自动化**（Puppeteer MCP 截图），不能只跑单测/curl。
- 具名失效模式：过早宣布胜利；留下脏环境；提前把功能标完成；每次都要重新摸索怎么跑起来。
- 附带代码：https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding （`security.py` bash 白名单作为 security hook；README：单次编码迭代 5–15 分钟，200 功能需"many hours"）。

**(b) Harness design for long-running application development** — Prithvi Rajasekaran，**2026-03-24**，https://www.anthropic.com/engineering/harness-design-long-running-apps
- 机制：**planner / generator / evaluator** 三角色（GAN 式）；generator 与 evaluator 在写码前**协商 sprint contract**；evaluator 用 Playwright MCP 点真应用，查 UI + API + DB 状态，**单条标准低于阈值则整个 sprint 判失败**；四条前端评分维度（design quality / originality / craft / functionality）用 few-shot 校准；agent 间用文件通信；曾用 context reset 替代 compaction（Sonnet 4.5 上"context anxiety"，Opus 4.5/4.6 后取消）。
- **成本对比数字（口径：单次运行，Opus 4.5→4.6）**：复古游戏编辑器 — 裸跑 **20 分钟 / $9**；完整 harness **6 小时 / $200**（"over 20x more expensive"）。DAW 一次运行合计 **3h50m / $124.70**（Planner 4.7min $0.46；Build R1 2h07m $71.08；QA R1 8.8min $3.24；Build R2 1h02m $36.89；QA R2 6.8min $3.09；Build R3 10.9min $5.88；QA R3 9.6min $4.06）。sprint 3 的 contract 含 27 条标准。
- 具名失效：自评宽松；QA 自我说服放过真问题；generator 用 stub 充数。

**(c) 佐证性实验**
- **Building a C compiler with a team of parallel Claudes**（Nicholas Carlini，2026-02-05）：16 个 agent、两周内**近 2,000 个 Claude Code 会话、20 亿输入 token、1.4 亿输出 token、略低于 $20,000**；产出 10 万行 Rust 编译器，能引导 Linux 6.9（x86/ARM/RISC-V），编译器测试套件 99% 通过。机制：`while true` + `--dangerously-skip-permissions`；**每 agent 一个 Docker 容器**；`current_tasks/` 文本文件 + git 做**任务锁**；`--fast` 1%/10% 确定性采样对抗"时间盲"；日志前缀 `ERROR` 便于 grep；**用 GCC 作为 known-good oracle**。
- **Scaling Managed Agents: Decoupling the brain from the hands**（2026-04-08）：把 **session / harness / sandbox** 三层虚拟化，接口 `execute(name,input)→string`、`provision`、`wake`、`getSession`、`emitEvent`、`getEvents`；凭证不进沙箱；**p50 TTFT 降约 60%、p95 降超 90%**。

### 1.3 Uber《Running a Software Factory Efficiently at Uber Scale》——本期最硬的一手数字

- **定位**：Uber Blog，Uday Kiran Medisetty（Distinguished Engineer），**2026-08-27**。permalink: https://www.uber.com/us/en/blog/efficient-software-factory/ （`/blog/...` 短链被 Uber 反爬拦截）。分类索引佐证：https://web.archive.org/web/20260917213225/https://www.uber.com/us/en/blog/engineering/
- **数字（含口径）**：
  - **7x** 周活用户增长、**9.4x** 周 agent 请求增长 — 口径："from February to Aug 2026, weekly active users across all agentic offerings across all our employees (engineers & non-engineers)"，用户跨工具去重。
  - **单次 1,000 次模型请求成本较峰值降近 34%**（2026-02→07，固定同一模型）；**单会话成本较 6 月峰值降 52%**（数据自 5 月末起）。
  - 总 AI 支出"自 4 月起相对稳定"。
  - **>70% 的 PR 归因于本地或云端 agent**；**3,600+ agent skills**、**30,000+ skill 执行/天**。
  - **单一统一网关承载 1,000+ 个内部与第三方 MCP server**；内部 MCP 工具"统一投影为 CLI 命令"。
  - **AI Context Graph：2,400 万节点 / 8,000 万边，86 种节点类型、117 种边类型，整合 30+ 个内部系统**。有据可依的一次查询 **38 秒且正确**，无据可依 **20 分 09 秒且错误**。
  - **prompt caching 经济学**：cache read 为 0.1x 标准输入价；写入溢价 5 分钟 1.25x、1 小时 2x；交互主 session 从 5 分钟 TTL 改 1 小时，subagent 保持 5 分钟。
  - 成本方程六项：users × sessions/user × turns/session × requests/turn × tokens/request × price/token。
  - 默认策略：**即使 1M 上下文模型也在 400K token 触发自动压缩**；reasoning effort 默认 Medium；MCP schema 预载在 100+ 工具时约 **50K–70K token**；code-mode 相对 LLM tool-use 省 **55%/58%/71%/59%/~100%** token；session 看板标记 **16 类反模式**；Slack 在预期支出 50/80/100% 处提醒。
- **工程价值**：把"软件工厂"从口号变成**可观测的成本函数 + 上下文图 + 网关治理**，这是目前公开材料里唯一同时给出 token 经济性与 agent 采纳率曲线的企业样本。

### 1.4 DoorDash Flux —— 平台原语化的云端 agent

- **定位**：DoorDash AI Research，X 长文 **2026-08-12**（作者 @SantoshPraneeth、@jeffizhungry），https://x.com/AIatDoorDash/article/2087284229751394705 （X long-form 已抓全文；同站 careers 博客对纯 reader 返回 403）。官方对应文章：**"Delegating Engineering Work To Cloud-Based Agents"，Santosh Banda / Jeffrey Hwang / Siddarth Kodwani，2026-08-11**，https://careersatdoordash.com/blog/delegating-engineering-work-to-cloud-based-agents/ （**该 URL 对直读、r.jina.ai、多个代理、`/amp/`、`/feed/` 全部 403，且 Wayback CDX 无 HTML 快照**——下述数字由三家独立转载方（ZenML LLMOps DB、InfoQ 2026-08-31、X 公告帖搜素片段）共同指向该 URL 交叉确认）。
- **数字**：**2026 年单月用 Flux 自动化 130,000 个工程任务**；**每周 >25,000 次自动 code review**；**>300 个 playbook**、**每周 >10,000 次调用**；Q1 2026 上线。
  - ⚠️ **口径警告**：DoorDash **从未定义 "engineering task"**，应视为**平台利用率**而非工程交付量。
- **前置两篇可完整核验的一手数据（Web Wayback）**：
  - **AI code reviewer**，2026-05-11，Adam Yarger + Adam Rogal（快照 `20260702004843`）：**每周 review >10,000 个 PR，覆盖 56 个已接入仓库**；**已裁决的高/严重级发现中 60.2% 导致工程师在 merge 前改代码（n=2,256）**，此前用第三方 review agent 的接受率为 **46%**；webhook 触发的发现接受率 **59.0%**；**约 $3 / 次 review**；**PR 开启后约 7 分钟出发现**。架构 v3 = **lead scout（发现）+ 两个 deep reviewer（验证）**；per-domain **review profile** 由 AGENTS.md、历史 PR review、Slack 决策、事故历史挖掘而成，并带 **drop-filter（"if CI would already catch it, drop it"）**；agent 跑在有完整 repo clone 的远端 VM 上，模型无关。自曝失效："**a turn counter is not a progress detector**"（所以用软/硬双超时）；按"每次成功 review 的成本"而非 token 单价计价；对报告者加护栏防"false-clean review"。
  - **DashBench 信任度**，2026-07-06，Sakth Dhulipalla / Vasily Vlasov / Marcus Yearwood / Adam Yarger（快照 `20260804010939`）：从约 1,000 个原始 PR 候选构建 **105 例有效报告**。生产 reviewer（Claude Sonnet 4.6 high scout + Claude Opus 4.8 high reviewer）：**504 条真实发现、加权 recall 53.6%、加权 precision 87.0%、$3.91/PR、725 s/PR**；对照组无 scout 的 GPT 5.5 high：**164 条发现、recall 30.7%、precision 84.1%、$0.75/PR**。最强 recall/F1：Kimi K2.6 scout + Claude Fable 5 reviewer（**65.2% recall、75.3% F1、$3.81/PR**）；最强 precision：Composer 2.5 + GPT 5.5 medium（**92.2% precision、18.0% recall**）。加权：critical=4 / high=2 / medium=1 / low=0.5。严重度分母 = **已裁决真实簇的并集：40 critical / 136 high / 271 medium / 385 low**（是簇，不是 PR）。
  - **方法论上最有价值的一句**：**"acceptance only ever populates two of four confusion-matrix cells"**——接受率无法记录假阴性与真阴性，所以必须另建带人工标注 / 生产反馈 / agent 判官三方分歧审计的三角基准。**这是"用接受率当质量指标"的正式反驳。**
- **架构（四原语）**：
  1. **Sandbox**：Firecracker microVM 做硬件级隔离；预置 repo/工具/密钥/依赖；**端到端 setup 的 p95 SLO < 5 秒**（起 microVM→clone→装构建工具→配置 harness）；支持单 session 跨多仓多 PR。
  2. **MCP gateway（Agent Gateway）**：每个 playbook 声明所需工具，**只授予该任务所需的 scoped 权限**，全量审计日志；统一认证/授权/可观测/用量/策略。
  3. **Playbook**：单个 YAML 文件包住任务、输入、上下文、skills、工具、权限、校验、期望输出、安全边界；**可混用 agentic 步骤与确定性步骤**（让逻辑在"模型判断"与"传统代码"之间迁移而不重构流程）——作者称其为"skills 与 agent 任务的 Docker 容器"。
  4. **Invocation surface**：同一 playbook 可从 Slack / GitHub / cron / CLI / conversational skill 触发。
- **三条落地经验**：**先窄后广**（从 code review 起步，因为高频、可度量、容易评估）；**让工作可见**（私聊频道不产生团队习惯，改公开 thread 后采纳模式才变）；**playbook 需要 enablement**（工作坊/黑客松教会团队识别哪些流程值得编码）。
- **陷阱**：自建而非托管 coding agent 的理由是"要么把敏感代码和上下文发给第三方，要么开一条从第三方回流内部系统的路"——这是安全/集成取舍，不是能力取舍。

### 1.5 Cursor Projects —— 协调器 + 云端规模化

- **定位**：Cursor，**2026-09-10**，https://cursor.com/blog/projects
- **机制**：**coordinator agent 不写代码，只派活**（因此"从不被阻塞"）；Project 跑在自己的机器上（合盖不停）；**跨云/本地的共享 context 文件集**（研究、产物、代码库知识、团队偏好持续沉淀）；**subscriptions**（监听 Slack、按计划运行、跟随 PR，CI 红了自动修）。
- **数字（口径：Cursor 内部与早期用户）**：新用户 merge PR 数 **+30%**；**以 Projects 为主的用户 merge 量是 6 倍**；某工程师的设计系统 Project "on track to touch 20 to 100 PRs a day"。
- **三种模式**：feature work（先研究→写 plan→并行实现/测试）、migration（先与协调器约定安全做法，再增量推进；早期逐个 review，稳定后放手）、gardening（永不结束的质量/回归工作，重复错误第二次出现就自动加 lint rule）——最后一条是"改工作流而非改单个 diff"的实例。

### 1.6 阿里巴巴《AI Native 研发范式实践手册》

- **定位**：阿里巴巴，主编许晓斌，**68 页 PDF，文件创建时间 2026-09-19**，在线版 https://ai-native.alistatic.com/app/ainativeinfra/ai-native-handbook-web/index ，PDF https://g.alistatic.com/s/v/ainativeinfra/ai-native-handbook/0.0.1/ai-native-handbook.pdf （矢量 PDF 无可提取文本层，本报告数字来自 150dpi 渲染 + tesseract chi_sim OCR，可能存在字符级误差）。X 侧首发线索：@hongming731 2026-09-25（133 赞）。
- **核心命题**：**"Coding 正在被解决，主战场在验证与环境。"** 引用 Jack Reeves《Code as Design》类比电气化：真正的生产率跃升来自"单元驱动"重构生产系统，而非把蒸汽机换成电动机。
- **关键数字（作者自述口径）**：
  - 编码只占研发链路 **20%–30%**；某真实交互需求"**编码 1 小时，上线 3 周**"（需求分析 1–2 天 / 联调环境 2–3 天 / 多平台联调 5–7 天 / 发布审批 3–4 天 / 灰度 2–3 天 / 封网 7–10 天，合计约 21 天）。
  - 价值迁移预测：2024 及以前 编码 50–60% / 测试 15–20% / 部署发布 10–15%；**2027+ 编码 ≤10% / 测试 20–25% / 部署与验证 40–50%**。
  - 案例一（AIDC 数字投手，2026/05→2026/08）**平均交付周期缩短一半、千行代码缺陷率下降 70%、变更失败率下降 90%**。
  - 引用 Anthropic 对约 40 万次 Claude Code 交互会话的分析：**人类承担约 70% 的规划决策，Claude agent 承担约 80% 的执行决策**。
- **基础设施五问（本篇最有价值的部分）**：长任务持续、企业知识可供给、可复现运行环境、权限与生产安全硬约束、行为可解释可评测。
  - **企业级 Agent Harness 职责**：上下文管理（分层加载 + 大输出落盘只留摘要）、规划/状态/恢复（记录已排除模块、当前假设、改动文件、待跑验证）、工具验证纠错（区分只读/可逆/影响外部的写操作；失败是下一轮输入）、人机协同（依赖升级、公共接口变更、绕过质量门禁必须交人）。
  - **企业定制的两个方向**：提供指引与行动能力（固定加载的 Rules/AGENTS.md、CLI/脚本/Codemod、Skill/示例/检索/Subagent）与提供检查与反馈（构建/测试/Lint/类型检查、拦截型 Hook、Review Agent）。**"对于必须严格执行的安全和质量门禁，应由程序控制，不能只依赖提示模型'记得遵守'。"**
  - **企业知识库四作用**：提供领域世界模型、把知识从模型参数外置（可更新/纠正/撤回/分级/授权）、为行动提供依据与约束、形成可共享可审计的组织记忆；整理→加工→治理→供给四段链路，并点名 **Google Open Knowledge Format (OKF)**（https://okf.md/spec/ ，Markdown + YAML frontmatter + 目录索引）。
  - **身份与权限（本期最完整的模型）**：`有效权限 = 用户权限 ∩ Agent 能力上限 ∩ 平台策略 ∩ 本次委托范围 ∩ 运行时约束`；四个对象分离——身份认证 / 委托 / 策略授权 / 凭证；**PDP 决策 + PEP 在执行点落地 + Credential Broker 代管长期凭证兑换短期凭证**；优先级"代理调用 > 注入短期凭证 > 注入长期凭证"；授权结果**三态**（允许 / 拒绝 / **需要补充授权 Challenge**），Challenge 是结构化授权请求而不是让模型猜的 403 文本。
  - **Guardrail（生产安全）**：`GuardrailSpec`（版本化 YAML，定义必检项、三态判定、每项最少 Evidence）+ `ChangeSet`（不可变动作上下文）+ `Submission`（逐项三态结果与证据）。**三态 PASS / BLOCKED / UNKNOWN**，"Guardrail 不解释 Evidence 的业务含义"，只做确定性协议约束与机械聚合；**必检项缺失或存在 BLOCKED/UNKNOWN 则不能放行**；已用于阿里内部代码发布与配置发布的批次恢复链路。
  - **可观测两层**：System Observability（对齐 OpenTelemetry）与 **Behavior Observability（核心对象 Trajectory：Session→Task→Trajectory→Step→Model Call/Tool Call/Skill Execution/State Change/Outcome）**；点名 **ATIF（Agent Trajectory Interchange Format）** 作为跨 agent 轨迹交换格式；分析用"确定性规则全量筛查 → LLM 判灰区 → 灰区多维分析"的级联漏斗。
  - **Sandbox 契约**：镜像/资源/销毁、命令与文件权限、出站白名单、**凭证不进沙箱（占位值 + 可信出站代理按域名/路径/方法注入）**、暂停/快照/恢复、失败现场保留；TTL 由服务端兜底回收防孤儿实例。**OpenSandbox 已捐给 Agentic AI Foundation（AAIF）**（https://github.com/opensandbox-group/OpenSandbox ，15.5k stars，Apache-2.0，Docker/K8s 双运行时 + gVisor/Kata/Firecracker 强隔离 + Credential Vault + Firecracker 预热池 ~80ms 启动；AAIF 为 Linux Foundation 项目，托管 MCP、goose、AGENTS.MD、agentgateway、A2A、Agent Router，https://github.com/aaif ）。
  - **组织侧（罕见的坦诚）**：讨论"蒸馏焦虑"——"每写一份 SOP、每教 AI 一个流程，确实是在把知识导出到组织资产里"，结构上接近替代关系；警告三条负反馈（培养断裂、知识藏匿破坏 harness 工作、行业级 senior 池枯竭）；要求"明确 AI 红利的分享方式""真实的接住机制""评价系统必须跟着变，口头说判断比执行值钱但 KPI 还是产出量，员工不会信"。

### 1.7 Martin Fowler / ThoughtWorks：把 harness 抽象成控制论模型

- **定位**：Birgitta Böckeler（Thoughtworks Distinguished Engineer），**2026-04-02**，https://martinfowler.com/articles/harness-engineering.html （前身 2026-02-17 的 memo 已被其取代并做了 URL 重定向）
- **模型**：`Agent = Model + Harness`，并进一步区分**三层 concentric harness**：模型 → coding agent 厂商内置 harness → **用户的 outer harness**。outer harness 两类控制：
  - **Guides（前馈）**：AGENTS.md、Skills、codemod、bootstrap 脚本 —— 提高一次做对的概率；
  - **Sensors（反馈）**：结构测试、pre-commit hook、review agent —— 让 agent 自纠；**"particularly powerful when they produce signals optimised for LLM consumption, e.g. custom linter messages that include instructions for the self-correction — a positive kind of prompt injection."**
  - 两类各分 **computational（确定性、毫秒到秒）/ inferential（语义、LLM-as-judge、更贵且有随机性）**。
  - 只有前馈会"编码规则却从不验证"，只有反馈会"反复犯同一个错"。
- **三类 regulation**：maintainability harness（当下最成熟）、architecture fitness harness、**behaviour harness（"the elephant in the room"，作者明确说还没解，把太多信任押在 AI 生成的测试上）**。
- **Harnessability**：强类型语言天然自带 type-check sensor；清晰的模块边界才谈得上架构约束；**"harness 最需要的地方恰恰是最难建的地方"（遗留系统）**。
- **Harness templates 的预判**：服务模板可能演化为 harness 模板（把某拓扑的 guides+sensors 打包），团队选技术栈时会参考"这个栈有没有现成 harness"——但也继承服务模板的版本漂移问题，且非确定性 guide/sensor 更难测。
- **与 OpenAI 的差异（作者的诚实标注）**：OpenAI 把 harness 理解为 agent runtime *之外*的一切，偏 back-pressure 与验证；作者认为其文本中 "harness" 只出现一次且指 evals。
- **配套雷达（ThoughtWorks Technology Radar Vol 34，2026-04）**：https://www.thoughtworks.com/radar
  - 主题之一直接点名**语义扩散**："terms such as spec-driven development and harness engineering are sometimes used inconsistently or overlap in meaning"——这是对本报告"概念通胀"问题的第三方确认。
  - Technique 环位：**Adopt** context engineering、curated shared instructions for software teams；**Trial** agent skills、feedback sensors for coding agents、mutation testing、progressive context disclosure、sandboxed execution for coding agents；**Assess** ralph loop、team of coding agents、agentic RL environments、architecture drift reduction with LLMs、code intelligence as agentic tooling；**Caution** agent instruction bloat、coding agent swarms、codebase cognitive debt、coding throughput as a measure of productivity、MCP by default。
  - Tools 侧：Claude Code / Cursor 进 **Adopt**；OpenAI Codex、Dev Containers、claude-code-plugin-marketplace 进 **Trial**；OpenClaw 进 **Caution**。
  - 安全主题"Securing permission-hungry agents"直接引用 Simon Willison 的"**lethal trifecta**"（私有数据 + 不可信内容 + 外部动作），并断言"安全 agent 系统应是**受限 agent 组成的流水线**，而不是单体 agent"。

### 1.8 LangChain / HumanLayer：harness 的组件学与反模式

- **The Anatomy of an Agent Harness**（Vivek Trivedy，**2026-03-10**，https://blog.langchain.com/the-anatomy-of-an-agent-harness/ ）：`Agent = Model + Harness`，"If you're not the model, you're the harness"；从"模型做不到什么"反推组件：**文件系统（durable state + 协作面）→ bash/代码作为通用工具 → sandbox 与默认工具链（self-verification loop）→ 记忆与检索（AGENTS.md 作为 context injection 式的 continual learning）→ 对抗 context rot（compaction / tool-call offloading / skills 渐进披露）→ 长程执行（filesystem+git、Ralph loop、planning+self-verification）**。
  - **关键工程观察**：**模型被 post-train 在自家 harness 内**导致过拟合（Codex 的 `apply_patch` 逻辑；OpenCode 为 GPT/Codex 专门补了 `apply_patch` 工具）；但**"the best harness for your task is NOT the one a model was post-trained with"**——引用 Terminal-Bench 2.0 榜：Opus 4.6 in Claude Code 排第 33，换 harness 后第 5。
- **Skill Issue: Harness Engineering for Coding Agents**（Kyle/@0xblacklight，HumanLayer，**2026-03-12**，https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents ）：
  - 把 harness engineering 定义为 **context engineering 的子集**，并补两个常被忽略的杠杆：**hooks（确定性控制流）**与 **skills（渐进披露）**；**subagent 是"context firewall"**——这是"跨多 session 保持一致性"的关键。
  - 具名反模式：**为"以防万一"预装几十个 skill/MCP**；**每次 agent 结束都跑全量测试（5+ 分钟）**；**微调哪个 subagent 能用哪些工具**（导致 tool thrash，效果更差）。
  - 有效做法：**只在 agent 真的失败后才加配置**；**back-pressure 必须 context-efficient（成功静默、失败才输出）**；"我扔掉的 hook 比留下的多得多"。
  - 对 MCP 的警告：**MCP tool description 会被注入 system prompt，是 prompt injection 面**；能由 CLI 替代的（GitHub/Docker/数据库）优先用 CLI，可省数千 token。
- **对照组证据（arXiv 2602.11988，ETH Zurich，2026-02-12，Thibaud Gloaguen 等）**：https://arxiv.org/abs/2602.11988 —— "providing context files **does not generally improve task success rates, while increasing inference cost by over 20% on average**"；**LLM 生成的 context file 反而降低表现**；仓库概览类内容（模型厂商推荐的那种）"are not helpful"；agent 在 context file 上多花 14–22% reasoning token。这是对"堆 AGENTS.md"的直接否证。

### 1.9 反方：Dex Horthy《Why Software Factories Fail》

- **定位**：Dex Horthy（HumanLayer），**2026-07-22**，https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/wsff.md （副标题 *or: harness engineering is not enough*；`humanlayer.dev/blog/...` 为 404）。X 分三部分长文，@Xudong07452910 的中文引荐帖 543 赞。
- **核心论点**：**这不是 harness 问题，是模型训练问题**。SWE-bench 类是二值奖励（`FAIL_TO_PASS`/`PASS_TO_PASS`）→ **"there is no penalty for eroding codebase maintainability"**；"**Tests give you feedback in seconds, but the cost function of bad architecture is measured in weeks, months, maybe even years**"；"if a model could reliably tell good code from bad, it might have written the good version to begin with, but maintainability has no fast oracle, so we can't reward for it during RL"。
- **自曝代价**：2025-07 全关灯跑；"By the ~third time in november, we decided it would be easier to rewrite from scratch"（联合创始人手写两周梳理模式）；**agent 建的代码库大约 3–6 个月就开始难维护**。
- **处方**：在写码**之前**把人类放回 4 个阶段 —— 产品需求 / 系统架构 / **程序设计（program design：类型、方法签名、调用栈树、文件树 diff）** / **垂直切片（vertical slice / tracer bullet）**；每次 review 100–200 行；约 **40% 任务仍是 oneshot**；结论是"**read the dang code**"，现实目标是**2–3x 且安全**，不是 10–100x。
- **与 Anthropic/OpenAI 的关系**：不是否定 harness，而是指出 **harness 只能提升下限、无法移动上限**（上限由 RL 教了什么决定）——与 Anthropic 自家"evaluator 需要 few-shot 校准""Claude 是糟糕的 QA agent"是一致的观察。

### 1.10 极端对照：StrongDM 的"关灯工厂"

- **定位**：https://factory.strongdm.ai/ ，Justin McCarthy，"Software Factories And The Agentic Moment"，**2026-02-06**；Simon Willison 分析 https://simonwillison.net/2026/Feb/7/software-factory/
- **章程原文**："Code **must not be** written by humans / Code **must not be** reviewed by humans"；"If you haven't spent at least **$1,000 on tokens today** per human engineer, your software factory has room for improvement"。
  - ⚠️ **纠错**：中文与 X 圈广泛流传的"每个工程师每月烧 1000 美元"是误引，原文为 **每天 $1,000**（约 $20k/月）。
- **机制**：**scenario 作为 holdout**（"end-to-end user story, often stored outside the codebase"）；**satisfaction** 指标（"of all the observed trajectories through all the scenarios, what fraction likely satisfy the user?"）；**Digital Twin Universe** —— 对 Okta/Jira/Slack/Google Docs 等做行为克隆，"thousands of scenarios per hour without hitting rate limits"；prompt 策略是"以最流行的公开 SDK 客户端库为兼容目标，目标永远是 100% 兼容"。
- **可核验性警告**：Horthy 明确说"I haven't been able to dig up **any definitive data/findings** from StrongDM on how that whole dark factory went"，公开的 weather-report 只有 2–6 月的稀疏更新。**本项属"当事人自述，未核验"。**

### 1.11 研究侧：Meta-Harness（自动化 harness 搜索）

- **定位**：*Meta-Harness: End-to-End Optimization of Model Harnesses*，Yoonho Lee、Roshen Nair、Qizheng Zhang、Kangwook Lee(KRAFTON)、Omar Khattab(MIT)、Chelsea Finn，**arXiv 2603.28052v1，2026-03-30**，COLM 2026。https://arxiv.org/abs/2603.28052 / 项目页 https://yoonholee.com/meta-harness/ / 产物 https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact
- **机制**：外层循环 —— 一个 coding agent proposer（Claude Code + Opus 4.6）通过 `grep`/`cat` 读**全部历史候选的源码、分数与执行轨迹**（**每轮中位数读 82 个文件**，41% 源码 / 40% 轨迹），产出新的单文件 Python harness；每轮约 60 个候选 / 20 次迭代。上下文量级对比（Table 1）：**Meta-Harness 10.0 Mtok/iter vs 此前方法 0.002–0.026**。基础模型冻结，proposer 不见测试集。
- **结果与口径**：
  - 在线文本分类（GPT-OSS-120B，LawBench/S2D/USPTO-50k）：**48.6% vs ACE 40.9%（+7.7）**，额外上下文 **11.4K vs 50.8K**（≈**4.46x**，论文表述为"4x fewer"）。
  - 数学检索（200 道 IMO 级题，5 个未见模型）：**34.1 → 38.8（+4.7）**，胜过 BM25 1.3 分。
  - **TerminalBench-2（89 任务 ×5 次）**：Opus 4.6 **76.4%**（超 Terminus-KIRA 74.7%，**但低于人工设计的 ForgeCode 81.8%，论文自称 #2**）；Haiku 4.5 **37.6%**（**#1**，超 Goose 35.5%）。
- **传播纠错（重要）**：X 上"**超越手工设计 agent 且把上下文 token 减少 4 倍**"的合并表述是不成立的——(a) 4x 是**文本分类**实验的数字，TerminalBench-2 **没有任何 token 计量**；(b) 在 TB2 上它并未超过最佳人工 harness。论文自曝"**search and final evaluation on the same 89-task benchmark**"，仅靠人工检查与正则审计缓解泄漏。

### 1.12 腾讯技术工程：多 agent 成本工程与团队记忆

- **《靠这 10 个优化点，我们把 Multi-Agent 工作流成本降了 50% 以上》**，**2026-08-21**，https://m.163.com/dy/article/L4SJ0FR50518R7MO.html （腾讯技术工程公众号镜像；原始 news.qq.com 对 reader 返回 501）
  - **Harness 形态**：1 个 TL + 6 个 sub-agent，5–6 个 wave，中等需求 20+ 次 sub-agent 调用。
  - **实测数字**：把 TAPD/Figma 的 MCP 拉取改为 sub-agent 作用域后，**单会话输入 token 1,030,000 → 634,905（−38.4%）**；代码图谱替代盲目搜索，**总 token 875,352 → 676,987（−22.7%）**；测试/视觉 agent 换用 GLM-5V（约为 Sonnet 的 36%）后，**该类 agent 成本 −64%**。
  - **诚实标注**：总体 "**50–65% 是估算，不是测量**"；并自曝"拆成 6 个 agent 意味着 6 份 system prompt 同时计费"。
  - **原则三条**：only-current-context / remove-irrelevant / remove-repeated。**这是"上下文雪球分段"的可复现工程做法**，也是本轮中文材料里最细的成本账。
- **《任何错误只犯一次：TencentDB Agent Memory 的团队记忆实践》**，**2026-08-18**，https://m.163.com/dy/article/L4KRP0DC0518R7MO.html
  - **四类资产**：Chat Memory / Wiki / CodeGraph / Skill；Chat Memory 分 **L0→L1→L2→L3**。
  - **路由**：身份 + ACL 范围 → 固定绑定 → 浮动召回 → **BM25 + 向量 + RRF 融合** → 在 token 预算内组装 Memory Pack；用 `/v3/tools/list` + `/v3/tools/call` 做渐进式披露。
  - **自报数字（口径：2,600 个会话、Redis 真实研发案例与访谈）**：SWE-bench 类任务完成率 **60% → 80%**；Top-50 长/难任务上**成本 −19% 且成功率更高**。
- **《10 万+ Skill 背后：腾讯 SkillHub》**，**2026-08-10**，https://m.163.com/dy/article/L408IUR60518R7MO.html
  - 10 万+ skills，**月下载 >1,000 万**；**TRACE 五维技能评测**（Trust / Reliability / Adaptability / Convention / Effectiveness），以**5 条并行链**把评测时间从 **~10 分钟压到 ~1 分钟**；云端隔离运行环境带真实执行轨迹；受控 12 个一级标签。
- **《从 Vibe Coding 到 AI 原生研发团队》**，**2026-07-21**（原 news.qq.com 返回 501，经 53AI 全文镜像 https://www.53ai.com/news/gerentixiao/2026072158237.html ）：项目 Vibe Flowing；**3 分钟全自动 Anydev 容器环境**；三层 Rules（根 `AGENTS.md` → `.vscode/anydev_rule.md` → CodeBuddy Memory）+ Skills（含两类代码腐化 skill 的**职责分离**）；`flow-db-exec` 等 CLI **硬拦截 DROP/DELETE/TRUNCATE 并强制 changelog.sql**；**轻量 SDD 退化为文件命名约定**（`draft_` → `ready_` → `done/`）；TDD 覆盖目标 70%（**非阻断**）；Playwright headless 自测；143 个 Storybook story 文件；非研发产品同学全程不碰 git 即可完成提需求/写代码/验收。

### 1.13 Cloudflare：把 harness 做在自己卖的平台上的内部实测

- **《The AI engineering stack we built internally — on the platform we ship》**，https://blog.cloudflare.com/internal-ai-engineering-stack/
  - **3,683 名内部用户（占全公司 60%、研发 93%）**；30 天 **4,795 万次 AI 请求**；**月 2,018 万次 AI Gateway 请求 / 2,413.7 亿 token**；Workers AI 另外 **518.3 亿 token**；**13 个 MCP server / 182+ 工具**；**约 3,900 个仓库生成了 AGENTS.md**；**AI code review 覆盖率 100%**（30 天 **547 万次 AI Gateway 请求 / 247.7 亿 token 用于 review**）；MR 四周滚动均值 **~5,600/周 → 8,700+/周，峰值 10,952（3 月 23 日那周）**。
  - **两个可复制的细节**：Code Mode 把 GitLab 的 34 个工具 schema（**约 15,000 token，占 200K 窗口的 7.5%**）**压缩成 2 个 portal 工具**；Backstage 侧维护 2,055 个服务 / 1,302 个 DB / 375 个团队作为 agent 的上下文底座。
- **《Orchestrating AI Code Review at scale》**，https://blog.cloudflare.com/ai-code-review/
  - 30 天（2026-03-10 → 04-09）**131,246 次 review 运行 / 48,095 个 MR / 5,169 个仓库**；**中位 3 分 39 秒**；**均价 $1.19**（中位 $0.98 / P99 $4.45）；**159,103 条发现（约 1.2 条/review）**；**约 1,200 亿 token，缓存命中率 85.7%**；**"break glass" 仅用 288 次（占 MR 的 0.6%）**。
  - **风险分级路由**：trivial/lite/full —— ≤10 行且 ≤20 文件 → 2 个 agent；>100 行或 >50 文件或安全敏感 → 7+ 个 agent。
  - **7 个专职 reviewer + 1 个 coordinator**（查重、重分类、合理性过滤）；**Hystrix 式熔断 + 模型降级链（`opus-4-7 → opus-4-6`）**；**prompt injection 防御方式之一是剥离边界 XML 标签**。

### 1.14 阿里云侧的企业级产物（线索级）

- **阿里云 AgentCore**（https://www.aliyun.com/product/agentcore ）：**Harness 配置即创建**、统一入站/出站身份认证、Agent Team 编排、**凭证隔离 + 沙箱**、全链路 Trace 进 CMS 2.0、完整审计日志；2026 云栖大会（9 月 22–24 日）配套发布**《阿里云企业级智能体手册》白皮书**（PDF 未定位，**UNVERIFIED**），分论坛称有阿里云内部 **15-agent 端到端研发小队**自用案例（原文未找到）。
- **《阿里云 AI Agent 网络白皮书》**（https://help.aliyun.com/zh/cloud-network-well-architected-design/alibaba-cloud-ai-agent-network-white-paper ，最后修改 2026-07-31）：沙箱网络供给数据 —— **单 VPC 15,000+ ENI**、**ENI 创建 <100 ms**、**ENI 弹出 1,000,000/分钟**（标注为内部测试数据）、NAT GW 每实例 EIP 池 ≤256 且按 SNAT hash 分配、**VPC 附加网段 /16 做 IP 复用**。
  - **工程含义**：这组数字直接回答了"每任务一个沙箱"在真实 VPC 里能不能扛住——**沙箱密度与网络供给是 microVM 方案的真实天花板**，而多数沙箱讨论只谈隔离、不谈供给。
- **信通院语境下的 "Harness Engineering"**：developer.aliyun.com/ebook/8553（2026-05-26，单页 deck）显示中国信通院已在"智能原生软件工程"框架内使用该词——**术语已进入标准机构视野**。
- **淘宝天猫海外技术《AI Native 研发范式升级实践与思考》**（阿里国际，**2026-09-23**，经 53AI 镜像 https://www.53ai.com/news/gerentixiao/2026092391583.html ）：**AI coding 占比从去年 5% 升到 85%**；但**编码只占需求全生命周期约 20%**，因此编码提速 200% 只带来约 10% 的真实收益；试点供给域**把整体研发估时砍掉 50%**；**≤5 人天的需求在钉钉群内闭环**（MRD→PRD→spec→code→test→release），>5 人天回本地 IDE；三道人审闸（PRD 确认、AI 测试验收、人工最终验收）。
  - 这与阿里手册"编码 1 小时、上线 3 周"的结论**互相独立地指向同一判断**。

### 1.15 Cursor《Scaling long-running autonomous coding》——多 agent 并发与冲突治理的一手实测

- **定位**：Cursor，Wilson Lin，**2026-01-14**，https://cursor.com/blog/scaling-agents （研究性质，非产品发布）
- **规模**：**单项目上数百个并发 agent**，跑了近一周，写出 **100 万行以上代码 / 1,000 个文件**（从零构建一个 web 浏览器，源码 https://github.com/wilsonzlin/fastrender ）；累计部署 **trillions of tokens**。其他在跑的实验：Java LSP（7.4K commits / 550K LoC）、Windows 7 模拟器（14.6K commits / 1.2M LoC）、Excel（12K commits / 1.6M LoC）；另有一次 **Solid → React 原地迁移，耗时 >3 周，+266K/−193K 行**（"still needs careful review, but was passing our CI and early checks"）。
- **并发协调的三次失败尝试（这是本报告找到的最诚实的多 agent 冲突治理材料）**：
  1. **共享文件 + 加锁自协调**：agent 各自声明任务、更新状态、用锁防重复。**失败方式**：(a) 持锁过久或忘记释放，**20 个 agent 退化到 2–3 个的有效吞吐**，大部分时间在等锁；(b) 系统脆弱——agent 可能在持锁时失败、尝试获取自己已持有的锁、或**不加锁直接改协调文件**。
  2. **乐观并发控制替代锁**：读自由、写时若状态已变则失败。更简单更健壮，但**更深的问题浮现**：没有层级时 agent 变得**风险厌恶**——回避困难任务、只做小而安全的改动、**没有 agent 对难题或端到端实现负责**，工作长时间空转而无进展。
  3. **引入 integrator 角色**做质量控制与冲突消解 → **作者明确说这是失败**："we found it created more bottlenecks than it solved. Workers were already capable of handling conflicts themselves."
- **最终可用结构**：**Planner / Worker 分离** —— Planner 持续探索代码库并产出任务（**可以 spawn 子 planner，使规划本身并行且递归**）；Worker 只专注于完成被分配的任务，**不与其他 worker 协调、不关心全局**，做完就推；每轮结束由 **judge agent** 决定是否继续，然后**下一轮从头开始（fresh start）**。
- **结论级判断（对 harness 设计直接相关）**：
  - **"Many of our improvements came from removing complexity rather than adding it."** 借鉴分布式计算与组织设计的模型**不是全部适用于 agent**。
  - **"The right amount of structure is somewhere in the middle. Too little structure and agents conflict, duplicate work, and drift. Too much structure creates fragility."**
  - **"The harness and models matter, but the prompts matter more."**（罕见的、来自大厂的"prompt 仍然重要"表态）
  - **模型分工**：GPT-5.2 在长程自主工作上更好（遵循指令、保持专注、避免漂移、完整精确实现）；**Opus 4.5 倾向更早停下并在方便时走捷径**；GPT-5.2 作为 planner **优于**专门为编码训练的 GPT-5.1-Codex → **按角色选模型，而不是一个通用模型**。
  - **未解问题**：planner 应在自己的任务完成后被唤醒以规划下一步；agent 偶发跑得过久；**仍需周期性 fresh start 对抗漂移与隧道视野**。
- **与 ThoughtWorks "Coding agent swarms = Caution" 的呼应**：后者指出两个 swarm 实验（Anthropic C 编译器、Cursor 浏览器）"**both teams chose use cases that could rely on existing detailed specifications, and in the case of the C compiler, comprehensive test suites that provide clear, measurable feedback. Those conditions are not representative of typical product development**"——这是对上述数字**最重要的一句限定**：100 万行、数百 agent、数周，是在**规格完备 + 反馈可测**的条件下取得的，不是普通产品开发的普遍情形。

---

## 2. 知识与上下文工程（维度 2）

- **渐进式披露已成共识**（OpenAI `AGENTS.md` 作为目录页；ThoughtWorks 把 "progressive context disclosure" 列入 Trial；Anthropic skills 机制；阿里"项目规则稳定加载、具体实现按需读取、大段工具输出落盘只留摘要"）。
- **反模式已被量化**：ThoughtWorks "agent instruction bloat"（Caution）：指令在长上下文中间被忽略的概率上升，**"research suggests hand-written versions are often more effective than LLM-generated ones"**（指向 arXiv 2601.20404 与 2602.11988）。
- **工具面的反向选择**：HumanLayer 主张"能用 CLI 就别用 MCP"，Uber 更进一步——**把 1,000+ MCP 工具"统一投影为 CLI 命令"**并报告 code-mode 相对 tool-use 省 55%–100% token。这与 ThoughtWorks 的 "MCP by default = Caution" 相互印证：**MCP 的问题不是协议，而是 schema 预载成本（Uber 实测 100+ 工具 ≈ 50K–70K token）**。
- **企业知识库的分层**（阿里）：整理（知识规范 OKF：是什么/适用范围/来源/责任人/更新时机/关联）→ 加工（切片+向量+关系，**"目标不是把内容全转成向量，而是保留足够结构"**）→ 治理（版本/责任/权限/过期/冲突，使用反馈回流）→ 供给（**RAG 不是唯一方式**：结构化 API 查确定事实、下载到本地文件系统检索、连业务系统取实时状态）。
- **知识保鲜与版本溯源（原缺口已补）**——本轮找到了三条实现路线，共同点是**"时效性是一等字段，而不是外挂的元数据"**：
  1. **ThoughtWorks "Context graph"（Assess，2026-04）**，https://www.thoughtworks.com/radar/techniques/context-graph ：把决策、政策、例外、先例、证据、结果建模为图上的**一等节点**；与 GraphRAG 的关键差异是——**"a context graph maintains temporal validity on every edge, so superseded facts are invalidated rather than overwritten"**。原文动机很具体：agent 处理一次折扣例外时，无法判断它反映的是常设政策还是一次性特批，因而**会推理错**；context graph 直接给出 provenance。适用于需要跨 session 持久记忆或需要可追溯决策链的场景。
  2. **Data Olympus**（https://github.com/knaisoma/data-olympus ）：Git-native 项目知识库 + MCP server，带**受治理的"提案→接受"工作流、validity windows（有效期窗口）、supersession chains（取代链）**，并检索"当前生效版"的工程指导。这是"文档级回滚 + 人工批注保留"思路的直接实现。
  3. **Deterministic Context Routing**（https://github.com/ai-erp-collab/deterministic-context-routing ）：用确定性链路（module registry → wiki → session state）只路由"必要且充分"的上下文，针对大型、文档不足的多模块代码库降低过度读取与上下文丢失。
  4. 配套：**plasma-ai/wiki**（https://github.com/plasma-ai/wiki ）——带确定性索引、作用域 CLI 访问、**并行编辑的合并处理**的 Markdown 知识库，解决"多人/多 agent 同时改知识"的冲突。
  - **工程判断**：所谓"知识库保鲜"在工程上不是"定期重跑 embedding"，而是 **图模型上的边级时效性 + 取代链 + 提案/接受审批**；这三者缺一，知识库就退化成一次性导入后逐渐失效的向量堆。
- **AST / 代码智能（原缺口已补）**：ThoughtWorks **"Code intelligence as agentic tooling"（Assess，2026-04）**，https://www.thoughtworks.com/radar/techniques/code-intelligence-as-agentic-tooling —— 问题陈述极准确："**LLMs process code as a stream of tokens; they have no native understanding of call graphs, type hierarchies or symbol relationships**"，于是 agent 花大量 token 去**重建 AST 里本来就有的信息**。解法是给 agent 接 AST 感知工具：**LSP**（"find all references"、"rename this type everywhere" 成为一等动作，而非脆弱的文本替换）、**OpenRewrite 的 Lossless Semantic Tree (LST)**（比 AST 更可保真改写）、以及 JetBrains MCP server / Serena MCP。收益：**更少的幻觉编辑 + 更低的 token 消耗**（把合适任务交给确定性工具）。这与我方 §2 阿里 Code Docs + Code Graph 是同一判断的两条独立证据。
- **RAG 的权限下沉**：ThoughtWorks **"Role-based contextual isolation in RAG"（Assess）**——**每个 chunk 在索引期就打上角色权限标签，查询期由检索引擎按认证身份收缩搜索空间**，使模型根本无法访问未授权上下文（因为它在检索阶段就被过滤掉了）；定位为内部知识库的零信任底座。这与阿里的 Credential Broker / PEP 分层是同一逻辑的两端（一个管知识可见性，一个管动作权限）。

---

## 3. 验证闭环与发布门禁（维度 3）

- **三态门禁的工业实现**：阿里 Guardrail 的 **PASS / BLOCKED / UNKNOWN**，且明确规定"**Guardrail 负责确保 UNKNOWN 不会被当作 PASS**"、"**必检项缺失或存在 BLOCKED/UNKNOWN 时不能形成可放行结果**"。这是本期最强的"防偷懒"机制样本，且已在代码发布与配置发布的真实链路运行。
- **门禁必须接流程才有约束力**：美团图灵评测原话——"**没有接入流程的门禁，本质上只是一个建议**"；并给出分层门禁（安全类/数据准确性类一票否决，体验类设阈值）与 Pass@k 多次试验取稳定结论。
- **差分/可证伪测试的原生实现（原缺口已补）**：**Cognition《Introducing FrontierCode》**（2026-06-08，https://cognition.com/blog/frontier-code ），这是目前唯一把"**代码质量**"而非"功能正确性"做成基准的一手实现：
  - **核心指标不是通过率而是"maintainer 会不会 merge 这个 PR"**；150 个任务由 **20+ 位顶级开源维护者**手工构造（**每个任务投入 >40 小时**），并明确"FrontierCode grades like a tech lead"，而非"像 CI 那样打分"。
  - **六条评轴**：behavioral correctness / regression safety / mechanical cleanliness / **test correctness** / **scope（改动边界）** / code quality；每条分 **blocker（merge 硬门槛）与 non-blocker**；未过 blocker 者得分直接为 0。
  - **三种新验证器（本报告认为最有价值的部分）**：
    1. **Reverse-Classical**——**把 agent 自己写的测试跑在原始（未修复）代码上，必须失败**。这是对"无效测试/永远绿的测试"的**确定性、自动化**判据，直击 §3 里"覆盖率掩盖逻辑空洞"的问题。
    2. **Adaptive Classical Grading**（工具名 `mutagent`）——用 LLM **外科手术式地修补测试环境或应用代码**，让严格的确定性测试能对齐开放式任务的多种合法实现，从而保留"确定性断言"这一强信号。
    3. **Code Scope**——用 `files`（允许/禁止/必须删除）、`size`（变更行数、净增长、文件数）、`semantic`（LLM 判断改动是否局限在某个函数内）三类约束强制 agent **克制**，不碰无关文件、不做无关重构。
  - **未饱和数字**：最难的 Diamond 子集（50 题）上，**Claude Opus 4.8 仅 13.4%**，GPT-5.5 6.3%、Gemini 3.1 Pro 4.7%；Main（100 题）Opus 4.8 34.3%、Extended（150 题）51.8%；最强开源 Kimi K2.6 在 Diamond 上仅 3.8%。**报告自称相对 SWE-Bench Pro 假阳性率低 81%**，依据是对 agent 轨迹的误分类分析。
  - **对我方的直接含义**：Horthy"maintainability 没有快速 oracle"的论断得到了实证支持——**即便把质量做成 rubric、投入 40 小时/题、并加三种新验证器，最强模型在最难子集上也只有 13.4%**。这既证明"质量可被部分机械化"，也证明"离解决还很远"。
- **流量回放/系统仿真的具名实现（原缺口已补）**：ThoughtWorks **"Temporal fakes"（Assess，2026-04）**，https://www.thoughtworks.com/radar/techniques/temporal-fakes —— 与传统的静态 mock 不同，**temporal fakes 维护内部状态机并建模真实系统的时间演化**。实例：某团队为大型 GPU 数据中心的可观测栈构建 **NVIDIA DCGM + InfiniBand fabric** 的 fake（用 Go 写），**可注入热节流、XID 错误风暴、link flap、PSU 故障**并配置强度与时长，用 process-compose 编排；**通过 MCP server 向 agent 暴露故障注入能力**，让 agent 触发故障并验证指标变化、告警触发、面板更新符合预期。作者明确警告：**fake 必须保持对真实行为的保真度，否则会在自动化流水线里制造虚假信心**。
  - 与门禁的关系：这是"**能主动制造故障来验证监控/告警/回滚**"的手段，补上了"只验证正向路径"的空白。
- **抗"永远绿的测试"**：ThoughtWorks **"Mutation testing"（Trial）**——**"the most honest signal for evaluating the real fault-detection capability of a test suite"**；在 AI 生成测试已成常态的当下，变异测试用于抓 **"perpetually green" tests**（因缺断言或 mock 解耦而与逻辑无关、永远通过）。工具：Stryker / Pitest / cargo-mutants。与 FrontierCode 的 reverse-classical 是同一目标的两条路径（一个靠变异、一个靠回放原始坏代码）。
- **评测基础设施的完整方法论**（美团《Agent 评测白皮书》系列 01，**2026-09-10**，https://tech.meituan.com/2026/09/10/Agent-Evaluation-White-Paper-01.html ；前置《Agent 评测漫谈》**2026-08-07**，https://tech.meituan.com/2026/08/07/Agent-Evaluation.html ）：
  - 体系 = **四个模块（离线评测 / 在线评测 / 在线监控 / Case 挖掘与归因）+ 三种能力 + 两条 Loop + 一套资产（评测集）**；观测是地基（"**看不见的问题，几乎不可能被稳定解决**"，公式"观测 + 评测 = 持续迭代"）。
  - **从"答案评测"走向"行为评测"**：端到端评测集回答"事有没有办成"，过程评测集回答"中间哪一步出了问题"；**"只有端到端会陷入'知道坏了但不知道哪坏了'，只有过程会陷入'每个模块都达标但用户就是不满意'"**。
  - **对齐方法论**：**"1 个独裁者好过 10 个民主者"**；指标下钻 + **Rubric 二元化**（是/否/未知）；用 **unknown 占比反查 Rubric 是否定义合理**；达到人人一致率/人机一致率阈值（如 85%、90%）前**只能叫机器标注，不能叫自动化评测**。量化效果：数字站主人机一致率 **99%**；Beam 用二元化方案把一致性从 **62% 提到 92%**；履约数字站长从 **20 多个指标扩到近 200 个**。
  - **两条 Loop 的咬合点**：同一批线上真实样本，经 Case 挖掘与归因后，一条流向"评测集/Rubric 该改"，一条流向"Agent 该改"；**只走第二条会把 Agent 优化成迎合评测标准而非解决用户问题**。
  - **观测基建**：与阿里 Trajectory 模型同构，均指向 Trace/Trajectory 作为评测与训练共享的数据资产。
- **评测自身的置信区间**：Anthropic《Quantifying infrastructure noise in agentic coding evals》（**2026-02-05**，https://www.anthropic.com/engineering/infrastructure-noise ）：同一模型、同一 harness、同一任务集，仅资源分配从 1x 到不限，**Terminal-Bench 2.0 成功率跨度 6 个百分点（p<0.01）**；infra error 率 5.8% → 0.5%；SWE-bench 上 5x RAM 带来 +1.54pp。结论：**"leaderboard differences below 3 percentage points deserve skepticism until the eval configuration is documented and matched"**，建议同时声明 guaranteed allocation 与 hard kill threshold 两个参数。
- **对照/反证数据**：Faros AI《The Acceleration Whiplash》（Q2 2026，**22K 开发者 / 4K 团队两年遥测**，https://www.faros.ai/research/ai-acceleration-whiplash ）：**PR 体积 +51%、每 PR bug +28%、中位 review 时长 5x、每 PR 事故 3x、代码 churn 10x**；高采纳组 epics +66.2%、tasks +33.7%、PR merge +16.2%，但 **deploys/week −11.7%、churn +861%**；生产侧 **每 PR 事故 +242.7%、月度事故 +57.9%、人均 bug +54%**。报告明确自称"**直接与 DORA 2025 的发现相矛盾**"，且强调"**高成熟度团队并不免疫**"。属相关性信号而非因果证明（Horthy 亦标注其为"correlation signal"）。
- **DORA 侧的准确版本（重要纠正）**：**2026 年并不存在 DORA 年度报告**——`dora.dev/sitemap.xml` 的 research 年份止于 `/research/2025/`，`/research/2026/` 与 Google Cloud 的"announcing the 2026 DORA report"均为 **404**。2026 年 DORA 实际发布的是 **《ROI of AI-assisted Software Development》（报告版本 `v. 2026.1`，页面最后更新 2026-04-22）**：https://dora.dev/ai/roi/report/ ，配套计算器 https://dora.dev/ai/roi/calculator/ 。
  - 其核心概念是本轮罕见的"反炒作"框架：**价值实现的 J 曲线**——转型初期必然出现生产率下探（作者称为"the tuition cost of transformation"），成因有三：学习曲线、**verification tax（AI 生成代码的验证税）**、下游流程适配。
  - 示例模型（500 人组织、全成本年薪 $176k）：首年价值约 $11.6M vs 投入约 $8.4M → **ROI 39%**，回本约 8 个月；计算器默认值：首年收益 **$3,281,000**、**ROI 39.2%**、**回本 0.7 年**。并沿用 2025 年的 **instability tax**：默认情景把变更失败率从 5% 建模到 6%，对应 **−$344,000** 的停机影响。
  - 引用数据：斯坦福——简单绿地任务 35–40% 提效，复杂遗留代码 **≤10%**；推理成本 2022-11→2024-10 降约 **280×**。
  - **2025 版年度报告的结论仍是最新年度基准**（https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report ，2025-09-24）：**90% 受访者使用 AI、>80% 报告生产率提升、但 30% 对 AI 生成代码"几乎不信任或完全不信任"**；与 2024 年不同，AI 采纳与**交付吞吐**转为**正相关**，但与**交付稳定性仍为负相关**；**90% 组织已采用至少一个平台**。方向性效应量（DORA Gen-AI 报告 https://dora.dev/ai/gen-ai-report/ ）：**AI 采纳率 +25% → 交付吞吐 −1.5%、交付稳定性 −7.2%**；**39% 的开发者对 AI 产出"只信任一点"或"完全不信任"**。
  - ⚠️ 中文与 X 圈流行的"2026 DORA 报告指出……"多数实际指向 ROI 报告或 2025 年报，注意区分。

---

## 4. 安全沙箱与权限即代码（维度 4）

### 4.1 沙箱：从容器到 microVM 的收敛

- **Docker Sandboxes**（https://docs.docker.com/ai/sandboxes/ ）：每个 agent 一个**hypervisor microVM**（独立 Linux kernel、独立文件系统、**独立 Docker Engine**、独立网络、非 root 用户带 sudo）；**不需要宿主 Docker daemon**；工作区三种挂载（直接 RW / `--clone` 只读 / mountless）；**所有出站 TCP 经宿主代理，默认拒绝，凭证以哨兵值进入 VM、由宿主代理按"域名+路径+方法"匹配后注入真实凭据——"Credential values are never stored inside the VM"**；支持 11 个 agent（Claude Code/Codex/Copilot/Cursor/Devin/Docker Agent/Droid/Gemini/Kiro/OpenCode/Shell）；CLI `sbx run|create|exec|ls|policy|secret|skills`；**刻意不做审批提示——"The sandbox itself is the safety boundary."** 两处已披露的放松点：SSH agent forwarding 默认开启；剪贴板默认只写。
- **NVIDIA OpenShell**（https://github.com/NVIDIA/OpenShell ，9.1k stars，Rust，Apache-2.0；https://build.nvidia.com/openshell ）：四层 —— **① Agent Sandbox（内核级文件/网络/系统调用控制，agent 跑生成代码或子进程时仍生效）② Supervisor（在 agent 工作负载之外执行策略；同一 API 可放行 read 而拦截 write；真实凭据不进入工作负载）③ Gateway（跨舰队生命周期与策略，团队级 workspace/权限）④ Policy Prover（**用形式逻辑验证策略变更授予的权限是否越界，或给出具体越界动作作为证据**）**。默认拒绝、按声明任务授予权限，**"enforcement outside the agent process, where enforcement cannot be influenced by model output"**。
- **Canonical Charmed OpenShell**（**2026-09-28**，https://canonical.com/blog/charmed-openshell-alpha-release ）：把 OpenShell 控制面接到 Juju/Canonical Kubernetes/MicroCloud；**LXD driver 为每次 agent 执行在容器边界开隔离沙箱**；集成 Charmed PostgreSQL 做状态 HA、OIDC 认证、gRPC ingress、COS 可观测。
- **Kubernetes SIG Apps agent-sandbox**（https://github.com/kubernetes-sigs/agent-sandbox ，4.1k stars）：`Sandbox` CRD + controller，管理"长时、有状态、单例、稳定身份"的工作负载；**明确声明"Agent Sandbox itself does not implement isolation"，把隔离委托给 RuntimeClass 指定的 gVisor/Kata**；自己负责默认拒绝的 NetworkPolicy、`automountServiceAccountToken=false`、过滤 `agents.x-k8s.io/*` 系统标签防 Service selector 伪造；扩展 CRD：SandboxTemplate / SandboxClaim / SandboxWarmPool。
- **smolvm**（https://github.com/smol-machines/smolvm ，6.4k stars，Rust）：libkrun microVM（HVF/KVM/WHP），每工作负载独立 guest kernel；**网络默认关闭 + `--allow-host` 白名单 + 凭证替换（guest 只见 `SMOL_PLACEHOLDER_*`，宿主 TLS 拦截器仅在精确 allowlist 的 DNS 名上换真值；占位符出现在 path/query/body 或路由头则 403）**；`SECURITY.md` 明确 TCB 含"宿主用户账号、宿主 OS、hypervisor、libkrun、smolvm"，并承认"**Releases are not currently signed or accompanied by provenance attestations**"。
- **阿里 OpenSandbox**（https://github.com/opensandbox-group/OpenSandbox ，15.5k stars）：生命周期控制面（OpenAPI 契约、状态语义 Running/Pausing/Paused/Resuming/Terminated/Failed、**服务端 TTL 兜底回收防孤儿实例**）+ 实例内执行面（命令/文件/持久会话/PTY/资源指标，结构化协议返回退出码）+ 网络与访问边界（**默认拒绝出站**，按任务放行；入站经网关鉴权、签据在网关校验并剥离）+ **凭证边界（沙箱只见占位值，可信侧车/代理注入）**，并提示"**凭证状态不应进入快照**，恢复后由可信控制面重新注入"。

### 4.2 沙箱边界的实测：SandboxGym 审计（本期最刺眼的数据）

- **定位**：Nebula Security，https://sandboxgym.io/ ，月度更新（**最近更新 2026-08-15**，下次 2026-09-15）。方法自述：**"Each product was audited by Nebula Security's code scanning agent against a fixed open-source snapshot"**，深扫描；只保留**能从沙箱内部利用且能瓦解隔离边界**的问题；排除越权只读与 GPU 相关项。
- **总览**：**9 个产品，32 项高影响隔离失效，2 次完全逃逸，100% 被计分产品至少有一项隔离失效**；分解为 **2 escape + 27 bypass + 3 cross-tenant**（**policy bypass 占 85%**）。
- **分产品**（逃逸/绕过/跨租户/合计）：smolvm 1/8/0/**9**；beta9 0/7/1/**8**；cua 0/3/1/**4**；sandbox-runtime 0/3/0/**3**；runtm 1/1/0/**2**；hypeman 0/1/1/**2**；nono 0/2/0/**2**；amika 0/1/0/**1**；agent-sandbox 0/1/0/**1**。
- **五个案例（机制级）**：
  - **runtm**：`runtm session prompt` **根本没有走沙箱**——"the shipped prompt path never launches that layer and instead runs host `claude --dangerously-skip-permissions`"。**宣称的边界在主路径上不存在**；`SECURITY.md` 邮箱不可达，问题未修。
  - **smolvm**：virtio-fs DAX 路径信任 guest 提供的共享内存偏移，`(moffset + len) > shm_size` 检查**非溢出安全**即调用 `mmap(..., MAP_FIXED, ...)` → VMM 任意代码执行（已修）；13 个漏洞中 4 个已修。
  - **sandbox-runtime（Anthropic 开源）**：Windows 后端**文件系统策略在不同执行路径上强制执行不一致**——"Restrictions that appear enabled at the configuration layer may be partially applied… or left unenforced"。引入提交 `4785dcc`（2026-06-26）与 `daef9ed`（2026-06-30）。
  - **amika**：`Mode: rwcopy` 挂载**从未被转成隔离副本**，直接透传 Docker bind mount → 沙箱内写入**持久落到宿主文件**（语义级漏洞：文档说隔离，实现没做）。
  - **hypeman**：调用方提供的 `snapshotId` 未做限制，`..` 经 `filepath.Join` 解析到快照根之上，`os.RemoveAll` 删除越界目录树（已修）。
- **披露姿态本身作为指标**：nono（2 天响应）/ smolvm（3 天）/ hypeman（响应并修复）较好；beta9 / runtm / cua / amika 未回复；**作者特意加了"Count ≠ exploitability"警示**（smolvm 发现数最多但 boot 后降权，需串联多 bug）。
- **本项可信度限定**：**发布方即扫描器厂商**（nebusec.ai），无第三方复核，无 CVE/PoC 逐条披露，`/appendix` 并非独立页面（同一单页文档的 JS 渲染表）。**"每个发现已在固定快照上复现"是页面自述，属当事人自述，未核验。**

### 4.3 权限即代码：从"声明"走向"跨厂商标准"

- **Blueprint Alliance**（https://blueprintalliance.ai/ ，Docker 于 **2026-09-22** 宣布加入，https://x.com/Docker/status/2102382560403710135 ）：跨厂商联盟，成员含 AWS、CrowdStrike、Databricks、Docker、Google Cloud、Okta、Salesforce、ServiceNow、Wiz、Zscaler 等；**六条 agent 治理原则**：① 每个 agent 是独立安全身份（像员工一样 provision/authenticate/deprovision）② **访问按任务授予、不做常驻授权**（单次动作的最小权限，完成后立即撤销）③ 委托链端到端可追溯 ④ **运行时行为要被监控，而不只是被 provision** ⑤ 遏制必须即时且可逆（kill switch）⑥ 治理要跟上 AI 演进速度。援引数据：**92% 的组织已在使用自主 agent，但只有 34% 以对待人类用户的同等严格度保护它们**。互操作锚定 **MCP / OCSF / SSF / CAEP**。
- **Anthropic《How we contain Claude across products》**（**2026-05-25**，https://www.anthropic.com/engineering/how-we-contain-claude ）：三种隔离模式 —— claude.ai 的 **gVisor 临时容器**、Claude Code 的 **HITL 沙箱**（Seatbelt/bubblewrap；**权限提示削减 84%**）、Claude Cowork 的 **全 VM**（guest 内有自己的内核/文件系统/进程表，凭证留在宿主 keychain，VM 只拿 per-session 受限 token）。
  - **四个"我们漏掉的风险"**（极高价值的一手失效复盘）：
    1. 信任对话框之前的执行：仓库里的 `.claude/settings.json` 定义 hook，而 Claude Code 在弹出"Do you trust this folder?"**之前**就读取项目设置 → 恶意 hook 自动执行；修法是"把 project-open、config-load、localhost listener 当成来自互联网的入站请求"。
    2. **用户即注入向量**：内部红队钓鱼让员工粘贴恶意 prompt，请求读取 `~/.aws/credentials` 并 POST 出去；**25 次重试中成功 24 次**；结论是"模型层防御锚定在用户意图上——用户自己打字时，分类器没有异常可抓"，**唯一有效的是环境层（egress 控制 + 文件系统边界）**。
    3. **通过被批准域名的外泄**：allowlist 放行 `api.anthropic.com`，攻击者用自己账号的 API key 让 Claude 读工作区文件并上传 → 数据外泄。**"allowlist 不应被理解为目的地过滤器，而应被理解为能力授予"**；修法是 VM 内的防御性 MITM 代理，只放行携带 VM 自身会话 token 的请求。
    4. 隔离把 EDR 也挡在外面：用 OTLP 拉取式导出做代偿，但"不是实时监控"，建议提前预算这场对话。
  - 数据点：权限提示批准率约 **93%**（审批疲劳）；auto mode 拦截约 **83%** 的"过度积极行为"，代价是约 **17% 漏过**、约 **0.4%** 的无害命令被误拦；Opus 4.7 在 Gray Swan Agent Red Teaming 上单次攻击成功率约 **0.1%**，100 次自适应尝试后 **5–6%**。

### 4.4 "OCI 镜像权限注解"的核查结果（原设问前提需修正）

Skill 维度 4 列出"权限收敛与声明规范（**OCI 镜像权限注解**、网络白名单/黑名单、代理注入凭证）"。
**核查结论：OCI 官方规范中不存在"agent 权限注解"这一标准。** 证据：https://github.com/opencontainers/image-spec/blob/main/annotations.md
- OCI annotations 是**任意键值元数据**，规则仅四条：key/value 必须是字符串；key 在 map 内唯一；**SHOULD 用反向域名表示**；`org.opencontainers` 前缀为 OCI 规范保留。
- 预定义键仅 14 个，全部是**描述性元数据**（`created` / `authors` / `url` / `documentation` / `source` / `version` / `revision` / `vendor` / `licenses` / `ref.name` / `title` / `description` / `base.digest` / `base.name`）。
- 明确的两条相反规则：**"Consumers MUST NOT generate an error if they encounter an unknown annotation key."** —— 也就是说，即便有人在镜像上写权限注解，**规范强制消费者忽略它**，因此它**不可能作为安全边界**（security-relevant 的字段不能是可选的、可被忽略的）。

**那么"权限即声明"在 2026 年实际落在了哪里？** 三条真实路径：
1. **Kubernetes CRD annotation（事实上的落地形态）**——如 **agentgateway** 的 `controller/api/annotations/agentgateway.go`，把 gateway/backend/model/policy 的声明式配置挂到 K8s 资源注解上（https://github.com/agentgateway/agentgateway ）。注解是**分发机制**，权限语义由控制器 + CRD schema 校验。
2. **独立策略文件 + 形式化验证**——NVIDIA OpenShell 的 **Policy Prover**（用形式逻辑验证策略变更授予的权限是否越界）、阿里 Guardrail 的 **GuardrailSpec（版本化 YAML + revision/digest）**。共同点：**权限写在独立、版本化、可评审、可验证的产物里，而不是写在镜像元数据里**。
3. **跨厂商参考架构**——Blueprint Alliance 的六原则，互操作锚定 MCP / OCSF / SSF / CAEP（其中 **SSF 即 Shared Signals Framework、CAEP 即 Continuous Access Evaluation Profile**，都是管"运行时权限变更与撤销信号传播"的，正好对应阿里"权限必须可撤销、可追溯"的诉求）。

**网络白名单/黑名单的实际写法**（此前列为缺口，现已补齐可抄样板）：
- **Docker Sandboxes**：首次运行强制选择全局预设 **Open / Balanced（默认拒绝 + 常见开发站点）/ Locked Down**；`sbx policy ls|allow|deny|rm network <host>` 做逐条增删；UDP 关闭（实验）、ICMP 阻断、DNS 走内部强制策略的解析器。
- **smolvm**：网络**默认关闭**，`--allow-host` / `--allow-host-pattern` 做 egress 白名单；凭证替换只在**精确 allowlist 的 DNS 名 + HTTPS/443** 上生效，占位符出现在 path/query/body 或路由头则返回 403；非白名单主机走**字节透明中继**。
- **OpenShell**：**出站请求先过 supervisor 做策略检查再离开沙箱**，且能在**同一个 API 上放行 read、拦截 write**（这是比 host 级 allowlist 更细的粒度）。
- **阿里 OpenSandbox**：**默认拒绝出站**，按任务放行代码仓库/依赖源/必要 API；**每个沙箱独立策略**（集群级宽泛规则无法表达不同任务的访问范围）；入站经网关鉴权，**签据在网关校验并剥离，不传给用户进程**。
- **agent-sandbox（K8s）**：默认拒绝的 managed NetworkPolicy——**入站只允许来自 Sandbox Router，出站阻断 RFC1918 + 云 metadata 端点**；`automountServiceAccountToken` 默认 false；过滤 `agents.x-k8s.io/*` 系统标签/注解以防 Service selector 伪造。
- **共同设计模式**：**默认拒绝 → 按任务声明放行 → 策略随沙箱实例隔离（不做集群级宽泛规则）→ 网络层与凭证层解耦（凭证只在匹配到"域名+路径+方法"时由宿主侧注入）**。

### 4.5 Diff 即审查：权限变更的评审形态

- **阿里 Guardrail 的机制本质就是"Diff 即审查"**：规则以 **不可变 revision + digest** 发布，运行中的 `GuardrailRun` 绑定当时选中的固定版本，**后续规则更新不会改变历史判断依据**；`ChangeSet` 快照进入 run 后**不可覆盖**，目标或上下文一变就**必须新建 run**——这等价于把"权限/规则变更"做成必须显式重审的 artifact diff。
- **OpenShell 把这一步做成了工具**：Policy Prover 能**证明权限在边界内，或给出一个具体的越界动作作为证据**，供人类与 AI 评审者共同判断——这是"给评审者证据"而非"给评审者结论"。
- **agentgateway** 提供 CEL 策略引擎 + `agentgateway_policy_valid/invalid.yaml` 这类**合法/非法样例配对**（https://github.com/agentgateway/agentgateway 的 `controller/api/tests/testdata/`），是"策略变更必须带正反例测试"的现成范式。

---

## 5. 企业实战复盘与组织转型（维度 5）

- **可量化的一线大盘**（见上文 §1.3 Uber、§1.4 DoorDash、§1.12 腾讯、§1.13 Cloudflare、§1.6 阿里）：本轮具备**采纳率曲线 + 单位经济性 + 组织机制**三件套的企业样本已从去年的 2–3 家扩到 6 家。共识高度一致：**先窄后广（从 code review / 单一高频场景起步）→ 让工作公开可见 → 用 enablement 把流程编码成 playbook/skill → 按"每次成功交付的成本"而非 token 单价计价**。
- **口径纪律（本期最重要的横向观察）**：把六家的一手数字并排看，会发现**分母定义差异极大**——DoorDash 的"task"未定义、Uber 的"PR 归因规则"未说明、阿里国际的"85% AI coding"分母未公布、快手用"发布到生产的全部行数"作分母。**跨公司比较这些百分比是无意义的**；有意义的是各自**同一组织内的时间序列**（Uber 7x/9.4x、Cloudflare MR 5,600→8,700/周、阿里国际 5%→85%、快手"30% 工程师 >40% 生成但 32% 低于 10%"的分布）。
- **组织侧的代价被正面讨论**：阿里的"蒸馏焦虑"段（"把自己蒸馏完，就在组织里没位置了"）是本轮中文材料里**唯一**系统讨论转型负外部性的内容：培养链条断裂（入门级岗位消失 → 三五年后 senior 池枯竭）、知识藏匿直接破坏 harness 工作、行业级"death of expertise"负反馈环。对应处方的关键一句：**"评价系统必须跟着变，口头说判断比执行值钱但 KPI 还是产出量，员工不会信。"**
- **度量体系分三层**（阿里）：**L1 AI 效能层**（覆盖率/Session/Token/AI 行/Skill/MCP/上下文资产）→ **L2 工程质量层**（AI 缺陷率/回滚返工/自修复缺陷/风险事件）→ **L3 价值交付层**（需求交付周期/变更周期/发布频率/AI vs 非 AI 对比）。关键判读规则：**"只看 L1 会鼓励'为了 AI 而 AI'；只看 L2 会变成质量审计；只看 L3 解释不了变化来自哪里。"** 并给了具体 SQL 采集模型（session_fact / code_fact / change_fact / workitem_fact 四表 join），用户侧用**轻量 Hook 适配 40+ 主流 AI 工具**（Hook 只本地轻量记录，解析/去重/归因/上报交后台消费者）。
  - 与业界口径的对照：Uber 的 `users × sessions/user × turns/session × requests/turn × tokens/request × price/token` 六项式就是"L1 的乘法分解"；**Uber 额外给出以结果计价的 managed-agent 指标（cost per merged PR / review / alert / cleanup、revert rate、MTTR）**，这是"从 L1 走向 L3"的具体实现。
  - **快手的分层更粗但同样诚实**（经 53AI 镜像 https://www.53ai.com/news/gerentixiao/2026080694182.html ；InfoQ 原文 https://www.infoq.cn/article/9rX1Ov951gKtaTmQb8Jq 返回 **HTTP 451**，未直读）：L1 Copilot → L2 Agent → L3 Agentic；2025-12 内部分布是 **30% 工程师 AI 生成占比 >40%，但同时有 32% 低于 10%**；2026 对 L2 需求占比目标 80%；核心结论 **"用 AI 开发工具 ≠ 个人提效 ≠ 组织提效"**，三类摩擦（人与人的摩擦、人与流程的摩擦、人与 AI 的摩擦），并指出**一个需求卷入的人越多，提效幅度越小**。
- **反方组织证据**：ThoughtWorks 把 "coding throughput as a measure of productivity" 直接列入 **Caution**；"codebase cognitive debt" 亦为 Caution，定义是"系统实现与团队共享理解之间的差距"，并指出其自我强化的循环。
- **遗留系统现代化（原缺口已补）**：Skill 点名的 Uplift / Transform / Reimagine 三分法**未在任何一方材料中以此措辞出现**，但同等内容的可操作版本已找到两条：
  1. **ThoughtWorks "Reverse engineering for design system"（Assess，2026-04）**，https://www.thoughtworks.com/radar/techniques/reverse-engineering-for-design-system —— 直接对应"遗留系统 Uplift"：当"设计标准"只以散落的网页、市场物料、截图形式存在时，用多模态 LLM **从既有视觉资产反向提取设计系统**（色板、字阶、间距规则、重复组件模式），合成结构化的语义表示，再接 Figma 产出可维护组件库。作者明确定位为"**brownfield 设计债**企业在全面重设计之前的务实起点"，目标是产出"**AI-ready design system**"。
  2. **ThoughtWorks "Mapping code smells to refactoring techniques"（Trial，2026-04）**：把 code smell **显式映射到指定重构手法**（第一层指向 Fowler《Refactoring》，专项问题用 Skill / slash command / AGENTS.md 映射），**与 lint 工具集成后，一旦检测到 smell 就触发对应重构方法**，形成确定性反馈。作者点名适用场景是 **".NET Framework 2.0 或 Java 8 这类遗留栈——通用训练数据往往覆盖不足"**，以及有独特工程标准的团队。这是"**改工作流而非改单个 Diff**"的实例：不修一个个坏味道，而是建立"坏味道 → 标准改法"的映射表并接进 lint。
  3. 补充一条**方法论分型**（walkinglabs 索引收录的一手短文）：**"Greenfield AI, Brownfield AI, and the Vibecode You Just Inherited"**（https://sawinyh.com/blog/greenfield-vs-brownfield-ai-codebases ）提出三分法——**agent 原生绿地 / 真遗留棕地 / 刚被人 vibecode 过、你继承下来的代码库**——并给出各自 playbook：分层 `CLAUDE.md` 规则、**带棘轮的 pre-commit hook（ratcheted，只许变严不许变松）**、**把存量 lint 违规基线化（baselined）而非全量清零**、feature-folder 重构，使"代码库本身不再成为 harness 瓶颈"。**"棘轮 + 基线"是处理存量技术债时最实用的一条工程约束**，值得直接借用。
- **AX（Agent Experience）的度量（原缺口维持"弱"）**：本轮仍未找到以"AX"为名的独立度量体系。但**ThoughtWorks "Measuring collaboration quality with coding agents"（Assess，2026-04）**提供了最接近的替代：**first-pass acceptance rate（首次通过率）、iteration cycles per task、post-merge rework、failed builds、review burden**；并明确要求**在团队级而非个人级度量**（理由与阿里的"评价系统必须跟着变"一致），与 DORA 指标并排看；Claude Code 的 `/insights` 命令被点名为可直接产出这类反思报告的工具。**结论：AX 目前没有独立指标体系，业界实际用"协作质量指标 + DORA"作为代理。**

---

## 6. Agent-Native 工具与协议（维度 6）

- **AAIF（Agentic AI Foundation，Linux Foundation 项目）** 成为 agent 基础设施的托管地：**MCP、goose、AGENTS.MD、agentgateway、A2A、Agent Router**，加 7 个工作组（Identity & Trust / Governance, Risk & Regulatory / Workflows & Process Integration / Accuracy & Reliability / Security & Privacy / Agentic Commerce / Observability & Traceability）与 Taxonomy & Landscape 横向工作流。https://github.com/aaif ／ https://aaif.io/ 。阿里 **OpenSandbox 已捐献**（手册与仓库均记载）。
- **OKF（Open Knowledge Format）**：https://okf.md/spec/ —— "a directory of markdown files with YAML frontmatter. That's it." 三条设计原则：**minimally opinionated（只有 `type` 是必填）/ producer-consumer 独立 / format not platform**；保留文件名 `index.md`（目录页、渐进披露）与 `log.md`（更新历史）；约定 `# Schema` / `# Examples` / `# Citations` 三个标题；明确"不替代 Avro/Protobuf/OpenAPI，而是引用它们"。
- **轨迹交换格式**：阿里手册点名 **ATIF（Agent Trajectory Interchange Format）** 作为跨 agent 统一轨迹协议；美团与阿里都主张 **Trajectory 是可观测数据也是评测数据资产**（同一份数据既定位失败，又构建评测/训练集）。
- **Agent 友好的 CLI 反转**：Uber 把 1,000+ MCP 工具投影为 CLI；HumanLayer 用自写 Linear CLI 替代 Linear MCP（"saved us thousands of tokens"）；阿里把内部研发系统（Aone 系）重新设计为面向 agent 的 **CLI 操作面**（作者自述"目前这个 CLI 每天被数万工程的 Agent 使用"），理由是"Agent 需要的不是更多 API，而是一套统一、稳定的研发系统访问方式"，并指出 MCP 解决了"模型如何调用工具"，但**没有解决"模型是否知道自己应该操作哪个对象"**（缺统一资源模型与上下文解析）。
- **Skills 作为分发单元**已成事实标准（Anthropic 起源 → Codex/OpenCode 跟进 → ThoughtWorks 列入 Trial → Uber 3,600+ skills/30k 执行每天），但**供应链风险已被点出**：HumanLayer 指出 skill registry 已被发现分发大量恶意 skill，"**Treat skills like you'd treat `npm install random-package`**"；ThoughtWorks 独立引用 Snyk 的 "ToxicSkills" 报告（`snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/`）警告未经审查的第三方 skill；对应防御手段是 **"Toxic flow analysis for AI"（Assess）**——因为风险已不止于 MCP，**恶意 skill 可以"看起来有用但内嵌外泄指令"**，建议用 **Agent Scan** 之类工具在部署前找出不安全的数据路径。
- **Agent 网关层已成独立品类（原缺口已补）**：**agentgateway**（https://github.com/agentgateway/agentgateway ，5.1k★，Rust，Apache-2.0，**Linux Foundation 项目**，同时是 AAIF 托管项目之一）——一个基于 **MCP + A2A** 的 AI-native 代理，覆盖 agent-to-LLM、agent-to-tool、agent-to-agent 三类流量：
  - **LLM Gateway**：统一 OpenAI 兼容 API 转发 OpenAI/Anthropic/Gemini/Bedrock，带**预算与花费控制**、prompt enrichment、负载均衡、failover；
  - **MCP Gateway**：工具联邦、stdio/HTTP/SSE/Streamable HTTP 四种传输、OpenAPI 集成、**OAuth 认证**；
  - **A2A Gateway**：能力发现、模态协商、任务协同；
  - **Inference Routing**：按 **GPU 利用率、KV cache、LoRA adapter、队列深度**做自托管模型路由（这是"推理侧调度"进入网关层的信号）；
  - **Guardrails**：正则 + OpenAI moderation + AWS Bedrock Guardrails + Google Model Armor + 自定义 webhook 多层过滤；
  - **安全与可观测**：JWT/API key/OAuth、**CEL 策略引擎做细粒度 RBAC**、限流、TLS、OpenTelemetry metrics/logs/tracing。
  - **与 Uber 的关系**：Uber 自建的"单一网关承载 1,000+ MCP server"是同一层的内部实现；agentgateway 是该层的开源等价物。**"网关"正在成为 agent 基础设施的标准位置——它同时是认证点、策略点、成本点与可观测点**，这与阿里 PEP（策略执行点）分布在网关的表述完全一致。
- **术语标准化已进入基金会流程（原缺口已补）**：**AAIF Taxonomy & Landscape Workstream**（https://github.com/aaif/ws-taxonomy-landscape ）——主席来自 Google，联席来自 Bloomberg，**每周一 8:30 PT 公开例会**；产出物是**交互式共享术语表（Taxonomy）**与 CNCF 风格的生态地图（Landscape，仍在路线图阶段，当前不接受 PR）。宪章明确目标："**eliminate siloed terminology, prevent duplicated research across working groups**"。
  - **这直接回答了本报告的一个元问题**：ThoughtWorks 说 "harness engineering" 等术语**语义扩散**（used inconsistently or overlap in meaning），AAIF 的动作是把它制度化——**术语表由基金会维护、由各工作组共同消费**。目前 Taxonomy 已发布交互式 dashboard 与 `taxonomy-data.js` 数据文件、并有 `validate-taxonomy.mjs` 校验器（说明术语表是可 CI 校验的产物，而非 wiki 页面）。
- **面向 agent 的结构化提取与可验证渲染（原缺口已补）**：
  1. **HTML Tools**（ThoughtWorks Assess，出处 https://simonwillison.net/2025/Dec/10/html-tools/ ）——把可分享的小工具**打包成单个 HTML 文件**：浏览器直接跑、随处托管、单文件分享，避开 CLI 分发（要发二进制/走包管理）的摩擦，也比建完整 Web 应用简单。**对 agent 场景的意义**：这是"**产出物本身可被 agent 与人共同检视**"的最低成本形态——源码可读、可在浏览器沙箱里跑、无需安装。ThoughtWorks 同时提示风险：运行不可信文件仍有风险，但**浏览器沙箱 + 可读源码**提供了部分缓解。
  2. **VLM 端到端文档解析**（ThoughtWorks Assess）——用 VLM 把"版面检测 + 传统 OCR + 后处理"的多段流水线压缩成**把文档图像当单一输入模态**，保住自然阅读顺序与结构化内容；点名 **olmOCR-2、DeepSeek-OCR(3B)、PaddleOCR-VL**。**关键警告（对本报告直接相关）**："their generative nature makes them prone to hallucinations"，低容错场景仍需混合方案或确定性 OCR。**这条适用于本报告自身**——阿里手册的 OCR 数字正是"多段流水线（pdftoppm + tesseract）"路径，若换 VLM 路径可能更顺但幻觉风险更高。
  3. **Agent Trace（代码归属规范）**（ThoughtWorks Assess，https://github.com/cursor/agent-trace ）——Cursor 提出的开放规范，标准化 **AI 代码归属**：`git blame` 只能说"这行被改过"，说不出"是人改的、AI 改的，还是两者"；Agent Trace 定义 **human / AI / mixed / unknown** 四类 contributor 与 trace record 描述每次贡献的来源，**对存储方式不做规定**，兼容 Git / Mercurial / Jujutsu。早期采纳：Cline、OpenCode、Git AI。
     - **为什么重要**：它是"**Agent 体验可审计**"的前置条件——没有归属规范，"哪些代码是 agent 写的、质量如何"这类度量（Uber 的 70% PR 归因、阿里的 AI 行占比）都只能靠各自私有的启发式。
     - 同时它补上了 ThoughtWorks "Codebase cognitive debt"的缓解面：当人类理解力追不上 AI 产出时，**至少要做到"知道哪一块是机器写的"**。
- **MCP 授权规范本体（原缺口已补）**：https://modelcontextprotocol.io/specification/draft/basic/authorization —— 关键事实逐条：
  - **授权对 MCP 实现是 OPTIONAL**；HTTP 传输族 **SHOULD** 遵循本规范，**STDIO 传输 SHOULD NOT 遵循本规范而应从环境变量取凭证**（即本地进程型 MCP 根本不在授权范围内）。
  - 基于 **OAuth 2.1 草案（draft-ietf-oauth-v2-1-13）+ 一批 RFC 的选定子集**：RFC6750（Bearer）、RFC8414（AS Metadata）、RFC7591（动态客户端注册）、**RFC8707（Resource Indicators）**、**RFC9728（Protected Resource Metadata）**、RFC9207（AS Issuer Identification）、OAuth Client ID Metadata Documents 草案、OIDC Discovery。
  - 角色映射：**MCP server = OAuth 2.1 resource server**，MCP client = OAuth 2.1 client。
  - **强制项**：MCP server **MUST** 实现 RFC9728 Protected Resource Metadata；client **MUST** 用它做授权服务器发现；AS **MUST** 实现 OAuth 2.1；AS 与 client **MUST** 同时支持 RFC8414 与 OIDC Discovery 两种发现；client **MUST** 实现 RFC8707 **并在授权请求与 token 请求中都带上 `resource` 参数**；token **MUST** 通过 `Authorization: Bearer` 头传递，**MUST NOT** 放进 URI query。
  - **最小特权是规范级要求**：server **SHOULD** 在 401 的 `WWW-Authenticate` 里带 `scope` 指明本次所需范围；client 的 scope 选择优先级是"**先用 401 挑战里的 `scope`**，没有才回退到 `scopes_supported` 全集"；`scopes_supported` 被明确定义为"**基础功能所需的最小范围**"，额外范围通过 **step-up authorization flow** 增量申请。server **MUST** 校验 token 是"专为它签发"（audience 校验，依 RFC8707）。
  - **弃用信号**：Dynamic Client Registration **已被标记 deprecated**，仅为兼容保留；推荐路径是 **Client ID Metadata Documents**（用 HTTPS URL 作为 client_id，AS 反查该 URL 取元数据并校验 redirect_uris）。
  - **对我方的含义**：这解答了"为什么 MCP 授权在中文材料里只被当作一句要求"——它确实是**协议层已定义完整、但落地时要企业自己补 PDP/PEP 与凭证代理**。阿里手册说"MCP 即使完成了 OAuth 登录，仍要对每个工具、动作和资源重新鉴权"，与规范的"token 必须做 audience 校验 + step-up 增量授权"是同一诉求的两层表述。
- **"Agent 友好的 CLI" 已形成反向生态**：除 Uber 投影、腾讯 `flow-db-exec`（硬拦截 DROP/DELETE/TRUNCATE 并强制 changelog.sql）、阿里内部 CLI 外，walkinglabs 索引中 **Uni-CLI**（https://github.com/olo-dot-io/Uni-CLI ）是极端形态——**711 条声明式 YAML pipeline 连接 134 个站点与桌面应用**，附带 8 阶段自适应修复循环、评测 harness、**逐次调用成本账本**、**硬编码的敏感路径 deny list**，并提供 `unicli mcp serve` 把每个 adapter 自动注册成一个 MCP 工具，**每次调用约 80 token**。
  - **这条印证了本报告的 MCP 批判立场**：同一个能力，走 MCP 要付 schema 预载成本（Uber 实测 100+ 工具 50K–70K token/轮），走"声明式 CLI + 每调用 80 token"则近乎免费。**"把 MCP 工具收敛成 CLI，再让 MCP 只做入口"是当前的最优组合。**

---

## 7. 噪声清单（明确排除或降级的条目）

| 条目 | 判定 | 依据 |
|---|---|---|
| "Meta-Harness 在 TerminalBench-2 上超越手工设计 agent，同时上下文 token 减少 4 倍"（X 爆款） | **合并表述不成立** | 4× 是文本分类实验数字；TB2 上 ForgeCode 81.8% > Meta-Harness 76.4%；且论文自曝 search/eval 同集 |
| "Harness Engineering 第 3 部分 / 两个问题搞定 loop、graph 与周工作"（@its_meseba，3 赞） | 降级 | 无外链、无数据、无失败复盘 |
| "用开源模型 + harness engineering 就能不用买高级模型"（@ChandanAILab，0–4 赞，连发 3 条） | 营销 | 无基线、无口径 |
| "不懂软件工程成功率 20%，用专业 harness 可达 100%"（@Saeiid，160 赞） | **营销** | 自述数字、无外链、无对照组；100% 与所有一方实验数据冲突 |
| "learn-harness-engineering，1.6 万星，14 讲 8 项目 15 语言"（@trendtech33566） | 课程推广，但**仓库属实** | 仓库 https://github.com/walkinglabs/learn-harness-engineering 16.6k stars，内容是对 OpenAI/Anthropic 一方文章的体系化整理，可作为**教学聚合**引用，不可作为一手结论 |
| CodeWalnut "Agentic SDLC Masterclass 3 天后开课" | 营销 | 无技术内容 |
| "每个工程师每月烧 $1000 token"（中文圈广泛流传） | **误引** | StrongDM 原文为**每天** $1,000 |
| "有人把 Grok Bot 变成了软件工厂，架构清晰且开源"（@KanikaBK，35 赞 + 13 转） | **大幅夸大** | 仓库 https://github.com/kunchenguid/grok-ship 仅 5 个 commit 的 markdown 包，README 自带"本仓库已被取代"横幅，无 CLI/无测试/无构建；描述基本属实但规模远小于暗示 |
| SandboxGym 的 32 项失效 / 2 次逃逸 | **半可用**：数字自洽可核，独立复现不可核 | 发布方即扫描器厂商；无 CVE/PoC 逐条披露；`/appendix` 为同一页面 |
| **"OCI 镜像权限注解"作为权限声明规范**（Skill 维度 4 的设问前提） | **不存在，且原理上不成立** | https://github.com/opencontainers/image-spec/blob/main/annotations.md ：annotations 是任意 KV 元数据，预定义键全是描述性字段；规范明文 **"Consumers MUST NOT generate an error if they encounter an unknown annotation key."** → 强制消费者忽略未知键，故**不可能承载安全边界**。真实落地在 K8s CRD annotation + 独立策略文件 + 形式化验证（OpenShell Policy Prover / 阿里 GuardrailSpec） |
| "Promotion Policy（分级放行策略）" | **无具名规范，只有等价实践** | 未找到以此命名的框架；等价物是 Cloudflare 的 trivial/lite/full 风险分级 + break glass 计数、阿里 Guardrail 的高风险动作人工审批、美团的分层门禁（一票否决 vs 阈值） |
| "AX / Agent Experience 度量体系" | **无独立指标体系** | 未找到以 AX 为名的度量框架；业界实际以 ThoughtWorks "collaboration quality metrics"（first-pass acceptance、iteration cycles、post-merge rework、failed builds、review burden）+ DORA 作为代理。Skill 该子项在 2026-09 尚无对应实物 |
| "Uplift / Transform / Reimagine"三分法 | **无一方材料以此措辞出现** | 同等内容以别的名字存在：ThoughtWorks "reverse engineering for design system"（遗留 Uplift）、"mapping code smells to refactoring techniques"（改工作流）、以及绿地/棕地/vibecode-inherited 三分法（含棘轮 hook 与 lint 基线化） |
| 第三方 skill registry（ClawHub / skills.sh 等） | **被点名为供应链风险** | HumanLayer："Treat skills like you'd treat `npm install random-package`"；ThoughtWorks 引 Snyk "ToxicSkills"（https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/ ）；对策是 toxic flow analysis + Agent Scan，因为**恶意 skill 可以"看起来有用但内嵌外泄指令"** |
| walkinglabs/awesome-harness-engineering 中的小众 harness 仓库（Citadel / LoopTroop / RailWarden / harness-evolver 等） | **存在但未逐一核验** | 该索引（4.2k★, CC0, 141 条）由社区维护；本报告**只使用其分类结构与被收录的一手文章**，未逐条打开这些个人/小团队仓库，故不作为结论支撑。其中 `harness-evolver` 自称基于 Meta-Harness（Lee et al., 2026），属衍生实现，未核验 |
| **阿里手册 OCR 数字** | **可信度中等** | 矢量 PDF 无文本层，数字来自 150dpi 渲染 + tesseract chi_sim；PDF 元数据 CreationDate 2026-09-19 已核验；数字与图表结论自洽但存在字符级误差风险。ThoughtWorks 对 VLM 端到端文档解析的警告（"prone to hallucinations"）反向支持选择确定性 OCR 路径 |
| "腾讯把 Multi-Agent 成本降了 50%+"（标题即结论） | **原文自我降级** | 文中明确"50–65% 是估算，不是测量"；可硬核引用的是 −38.4% / −22.7% / −64% 三项实测 |
| "@undefinedKi：DoorDash 一个月自动化 130,000 个工程任务"（751 赞） | 数字**属实**，但转述含推断 | 一手为 DoorDash X 长文，130,000 有原文；转述中的"笔记本上的 agent 与其他程序共享"等为作者引申 |
| "Uber 70%+ PR 归因于 agent"（多条转述） | **属实** | 一手 https://www.uber.com/us/en/blog/efficient-software-factory/ 原文 ">70% of PRs attributed to local or cloud agents" |
| "2026 DORA 报告指出……"（中文与 X 圈多篇） | **信源错误** | 2026 年**不存在** DORA 年报；`/research/2026/` 404，sitemap 年份止于 2025；2026 年只有 *ROI of AI-assisted Software Development*（v2026.1） |
| "Uber 把 reasoning effort 默认设为 Medium / 400K 自动压缩"（多条转述） | **属实且已核对原文** | https://www.uber.com/us/en/blog/efficient-software-factory/ 逐字确认 |
| "字节跳动 Agent 实践手册"（PDF 在 53AI/CSDN 流传） | **非一手** | 日期为 2025-11，内容为 Coze 插件与 Trae 的通用平台介绍；字节跳动技术团队 2026 年无 agentic-SDLC 文章 |
| 《阿里云企业级智能体手册》白皮书（云栖大会 2026-09-23 发布） | **未定位** | 仅有产品页 https://www.aliyun.com/product/agentcore 与掘金分论坛帖；PDF 本身未找到 |
| 《agentic coding AI Native 研发范式实践手册》OCR 数字 | **可信度中等** | 矢量 PDF 无文本层，数字来自 150dpi 渲染 + tesseract chi_sim；数字与图表结论一致但存在字符级误差风险；PDF 文件元数据 CreationDate 2026-09-19 已验证 |
| "腾讯把 Multi-Agent 成本降了 50%+"（标题即结论） | **原文自我降级** | 文中明确"50–65% 是估算，不是测量"；可硬核引用的是 −38.4% / −22.7% / −64% 三项实测 |
| "腾讯DB Agent Memory 让 SWE-bench 完成率 60%→80%" | **当事人自述，未核验** | 口径为 2,600 会话 + Redis 案例 + 访谈，非标准 SWE-bench 跑分 |
| 阿里系 SEO 形文章（developer.aliyun.com 的"2026 研发效能蓝皮书"等） | **低权重** | 作者为注册社区用户，非阿里工程团队署名 |
| Anthropic 的 "Notes from the Field"（本 Skill 点名的信源） | **不存在** | https://www.anthropic.com/engineering 索引与 https://www.anthropic.com/engineering/notes-from-the-field（404）均无此标题；Anthropic 侧对应内容是 *Effective harnesses* / *Harness design* / *How we contain Claude* |

---

## 8. 覆盖自查（六维度）

| 维度 | 覆盖情况 | 剩余缺口 |
|---|---|---|
| 1 Harness Engineering 与流程编排 | **充分（原缺并发/冲突治理已补）**。状态文件（feature_list.json / claude-progress.txt / exec-plans / SQLite 待办）、Hook 门禁（含 pre-tool-use 拦截改写指令）、主子 agent 隔离与 context firewall、DAG/并发（Cursor Projects 数千 subagent；C 编译器 16 agent + `current_tasks/` 文件锁；腾讯 1 TL + 6 sub-agent × 5–6 wave）、**多 agent 冲突治理的三次失败与最终结构（Cursor：锁 → 乐观并发 → integrator，最终 Planner/Worker 分离 + judge + 每轮 fresh start；"20 个 agent 退化到 2–3 个吞吐"）**、成本口径（Uber 六项方程、Anthropic $/次、腾讯逐项 token 账）齐全 | **部分**：缺"强制型 Go/Rust 调度器取代纯 prompt 调度"的一手实现——Cursor 明确说"**the prompts matter more**"，腾讯 wave 编排亦属框架级，**这一条在 2026-09 的公开材料里可能就是尚无实物**（已作为结论而非单纯缺口标注） |
| 2 知识与上下文工程 | **充分（原"缺保鲜/溯源"已补）**。渐进披露、AST/代码智能（LSP + OpenRewrite LST + 阿里 Code Docs/Code Graph + 腾讯 CodeGraph）、OKF 知识规范、**知识保鲜三路线（context graph 边级时效性 + 取代而非覆盖 / Data Olympus 的 validity windows + supersession chains / deterministic context routing）**、**RAG 权限下沉（chunk 级角色标签 + 检索期过滤）**、团队记忆路由（腾讯 L0–L3 + BM25/向量 RRF + Memory Pack 预算）、MCP→CLI 反转的 token 量化齐全 | **弱**：缺"**保留人工批注**"（human annotation 持久化与防覆盖）的具名实现——阿里提"过去依赖人口头传递的过期知识，被迫转化为结构化上下文"，Data Olympus 的"提案→接受"工作流最接近，但未给出批注如何与 agent 生成内容共存而不被下一轮覆盖 |
| 3 验证闭环与发布门禁 | **充分（原缺流量回放/可证伪测试已补）**。三态门禁（阿里 PASS/BLOCKED/UNKNOWN + 机械聚合 + "UNKNOWN 不得当 PASS"）、**Reverse-Classical（agent 测试必须在原始坏代码上失败）**、**Adaptive Classical Grading (`mutagent`)**、**Code Scope 三类约束**、变异测试抗"永远绿"、**Temporal fakes 主动注入故障验证监控**、分层门禁与流程接入（美团、Cloudflare 风险分级）、评测噪声置信区间（Anthropic 6pp）、DashBench "接受率只填满混淆矩阵两格"、Faros/DORA 反证数据齐全 | **弱**：缺"**Promotion Policy（分级放行策略）的具名框架**"——Cloudflare 的 trivial/lite/full 风险分级 + break glass 计数、阿里 Guardrail 的高风险动作人工审批，共同构成事实上的分级放行，但**没有找到以 "Promotion Policy" 为名的规范或白皮书** |
| 4 安全沙箱与权限即代码 | **充分（原缺 OCI 注解/网络写法已补，且纠正了设问前提）**。microVM 收敛（Docker/NVIDIA/Canonical/K8s/smolvm/OpenSandbox 六家）、凭证代理注入的一致性设计、实测失效（SandboxGym 32 项）、跨厂商治理（Blueprint Alliance 六原则 + MCP/OCSF/SSF/CAEP）、权限代数（阿里五元交集 + PDP/PEP/Credential Broker）、**网络白/黑名单六家写法对照**、**Diff 即审查的三种实现（不可变 revision+digest / Policy Prover / 合法-非法样例配对）**、Anthropic 四个真实失效复盘齐全。**并已证明"OCI 镜像权限注解"不存在且不可能作为安全边界** | **弱**：SandboxGym 缺独立第三方复核（发布方即扫描器厂商）；缺**多租户隔离**在真实云环境下的独立测量（阿里云给了 ENI 供给数字，但未给跨租户攻击面数据） |
| 5 企业实战复盘与组织转型 | **充分**。Uber / DoorDash / 阿里 / 阿里国际 / 腾讯 / Cloudflare / 快手 七份一手复盘含采纳曲线、单位经济性、组织机制与失败自曝；度量 L1/L2/L3 + 分母纪律；组织代价（蒸馏焦虑）正面讨论；**遗留系统现代化已补两条实操（反向提取设计系统 / smell→refactor 映射接 lint）+ 一条分型方法论（绿地/真棕地/继承来的 vibecode，含棘轮 hook 与 lint 基线化）** | **弱（确认）**：**AX（Agent Experience）确实没有独立指标体系**——已用 ThoughtWorks 的"协作质量指标（first-pass acceptance / iteration cycles / post-merge rework / failed builds / review burden）+ DORA"作为代理，并已说明这是代理而非原生体系 |
| 6 Agent-Native 工具与协议 | **充分（原缺网关层/术语标准化/结构化提取/MCP 本体已全部补齐）**。AAIF 托管版图 + **Taxonomy & Landscape Workstream（术语表制度化，含 `validate-taxonomy.mjs` CI 校验器）**、OKF、ATIF、**Agent Trace 归属规范（human/AI/mixed/unknown 四类 contributor）**、**agentgateway 三层网关（LLM/MCP/A2A）+ Inference Routing + CEL RBAC**、**MCP 授权规范逐条（OAuth 2.1 + RFC 8707/9728/9207，scope 最小化与 step-up 增量授权，DCR 已 deprecated）**、**HTML Tools 与 VLM 文档解析（含幻觉警告）**、agent 友好 CLI 生态（Uber 投影 / 腾讯 flow-db-exec / Uni-CLI ~80 token 每调用）、Skills 供应链风险与 toxic flow analysis 齐全 | **弱**：缺 A2A 协议本体的逐条细节；缺 **MCP Apps / AG-UI Protocol** 这类"agent→UI"方向规范的实现材料 |

**结论**：四个原列缺口（知识保鲜/版本溯源、差分与流量回放、OCI 权限注解与网络白名单写法、遗留系统现代化）**已全部补齐或转化为有证据的否定结论**；AX 与 Promotion Policy 两项经核查**确实不存在具名标准**，已改为"用最接近的代理"并保持诚实标注。

**方法论缺口说明**：本轮 `web_search` 全部 provider 被反爬拦截（Startpage/DuckDuckGo/Ecosia/Google/Mojeek），仅一次经 Brave 生效；信源获取依赖 X 登录态检索 + 直接 URL 读取 + 6 个并行子代理核查。这意味着**可能遗漏了未被 X 或已知 URL 覆盖的一手来源**（尤其公众号原始页面与 arXiv 最新列表）。

**国内一线覆盖**：**腾讯技术工程已补全**（三篇 2026 年 7–8 月一手文章，经 163/53AI 镜像读取；原始 news.qq.com 对 reader 返回 501）；**字节跳动仍是真实空白**——字节跳动技术团队 Juejin 流无 2026 年 agentic-SDLC 文章，唯一相关的一方产物是 **ByteDance Seed《Harness-IF: Evaluating Instruction Following Across Instruction Surfaces in Coding Agents》(2026-08-12, https://seed.bytedance.com/en/public_papers)**，属评测方向而非工程落地；流传的《字节跳动 Agent 实践手册》PDF 为 2025-11 的通用平台材料（Coze 插件 / Trae 介绍），**非一手**。

---

## 9. 关键一手来源链接表

**实验室与工程博客**
- OpenAI《Harness engineering: leveraging Codex in an agent-first world》2026-02-11 — https://openai.com/index/harness-engineering/ ／存档 https://web.archive.org/web/20260924171239/https://openai.com/index/harness-engineering/
- Anthropic《Effective harnesses for long-running agents》2025-11-26 — https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic《Harness design for long-running application development》2026-03-24 — https://www.anthropic.com/engineering/harness-design-long-running-apps
- Anthropic《Building a C compiler with a team of parallel Claudes》2026-02-05 — https://www.anthropic.com/engineering/building-c-compiler
- Anthropic《Scaling Managed Agents》2026-04-08 — https://www.anthropic.com/engineering/managed-agents
- Anthropic《How we contain Claude across products》2026-05-25 — https://www.anthropic.com/engineering/how-we-contain-claude
- Anthropic《Quantifying infrastructure noise in agentic coding evals》2026-02-05 — https://www.anthropic.com/engineering/infrastructure-noise
- Anthropic《Demystifying evals for AI agents》2026-01-09 — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Anthropic autonomous-coding quickstart（security hook 代码）— https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding
- Uber《Running a Software Factory Efficiently at Uber Scale》2026-08-27 — https://www.uber.com/us/en/blog/efficient-software-factory/
- DoorDash Flux 公告（X 长文，正文已抓）2026-08-12 — https://x.com/AIatDoorDash/article/2087284229751394705
- DoorDash Flux 官方文章 2026-08-11（直读 403，无 Wayback HTML 快照，数字由 3 家转载交叉确认）— https://careersatdoordash.com/blog/delegating-engineering-work-to-cloud-based-agents/
- DoorDash AI code reviewer 2026-05-11（Wayback 全文）— https://web.archive.org/web/20260702004843/https://careersatdoordash.com/blog/doordash-built-an-ai-code-reviewer-engineers-actually-listen-to/
- DoorDash DashBench 2026-07-06（Wayback 全文）— https://web.archive.org/web/20260804010939/https://careersatdoordash.com/blog/how-we-learned-to-trust-our-ai-code-reviewer-at-doordash/
- Cursor《Introducing Projects》2026-09-10 — https://cursor.com/blog/projects
- 阿里巴巴《AI Native 研发范式实践手册》2026-09-19 — https://ai-native.alistatic.com/app/ainativeinfra/ai-native-handbook-web/index ／ PDF https://g.alistatic.com/s/v/ainativeinfra/ai-native-handbook/0.0.1/ai-native-handbook.pdf
- 美团《Agent 评测白皮书系列 01：Agent 评测全览》2026-09-10 — https://tech.meituan.com/2026/09/10/Agent-Evaluation-White-Paper-01.html
- 美团《Agent 评测漫谈》2026-08-07 — https://tech.meituan.com/2026/08/07/Agent-Evaluation.html
- 腾讯技术工程《10 个优化点把 Multi-Agent 工作流成本降 50%+》2026-08-21 — https://m.163.com/dy/article/L4SJ0FR50518R7MO.html
- 腾讯技术工程《任何错误只犯一次：TencentDB Agent Memory 团队记忆实践》2026-08-18 — https://m.163.com/dy/article/L4KRP0DC0518R7MO.html
- 腾讯技术工程《10 万+ Skill 背后：腾讯 SkillHub》2026-08-10 — https://m.163.com/dy/article/L408IUR60518R7MO.html
- 腾讯技术工程《从 Vibe Coding 到 AI 原生研发团队》（经 53AI 镜像）2026-07-21 — https://www.53ai.com/news/gerentixiao/2026072158237.html
- Cloudflare《The AI engineering stack we built internally》— https://blog.cloudflare.com/internal-ai-engineering-stack/
- Cloudflare《Orchestrating AI Code Review at scale》— https://blog.cloudflare.com/ai-code-review/
- 淘宝天猫海外技术《AI Native 研发范式升级实践与思考》（经 53AI 镜像）2026-09-23 — https://www.53ai.com/news/gerentixiao/2026092391583.html
- 快手《AI 研发范式升级》（经 53AI 镜像；InfoQ 原文返 451）— https://www.53ai.com/news/gerentixiao/2026080694182.html
- 阿里云 AgentCore 产品页 — https://www.aliyun.com/product/agentcore
- 《阿里云 AI Agent 网络白皮书》2026-07-31 — https://help.aliyun.com/zh/cloud-network-well-architected-design/alibaba-cloud-ai-agent-network-white-paper
- DORA《ROI of AI-assisted Software Development》v2026.1 — https://dora.dev/ai/roi/report/ ／ 计算器 https://dora.dev/ai/roi/calculator/
- DORA 2025 年度报告（最新年度基准）— https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report ／ https://dora.dev/research/2025/dora-report/
- DORA Gen-AI 方向性效应量 — https://dora.dev/ai/gen-ai-report/
- Canonical《Charmed OpenShell alpha》2026-09-28 — https://canonical.com/blog/charmed-openshell-alpha-release
- Faros AI《The Acceleration Whiplash》Q2 2026 — https://www.faros.ai/research/ai-acceleration-whiplash

**分析机构 / 方法论**
- Martin Fowler（Birgitta Böckeler）《Harness engineering for coding agent users》2026-04-02 — https://martinfowler.com/articles/harness-engineering.html
- ThoughtWorks Technology Radar Vol 34（2026-04）— https://www.thoughtworks.com/radar ；**techniques 全量目录** https://www.thoughtworks.com/radar/techniques
  - feedback sensors for coding agents — https://www.thoughtworks.com/radar/techniques/feedback-sensors-for-coding-agents
  - agent instruction bloat（Caution）— https://www.thoughtworks.com/radar/techniques/agent-instruction-bloat
  - codebase cognitive debt（Caution）— https://www.thoughtworks.com/radar/techniques/codebase-cognitive-debt
  - coding throughput as a measure of productivity（Caution）— https://www.thoughtworks.com/radar/techniques/coding-throughput-as-a-measure-of-productivity
  - measuring collaboration quality with coding agents（≈AX 最佳代理）— https://www.thoughtworks.com/radar/techniques/measuring-collaboration-quality-with-coding-agents
  - **context graph（知识保鲜：边级时效性 + 取代而非覆盖）** — https://www.thoughtworks.com/radar/techniques/context-graph
  - **role-based contextual isolation in RAG（权限下沉到检索层）** — https://www.thoughtworks.com/radar/techniques/role-based-contextual-isolation-in-rag
  - **code intelligence as agentic tooling（LSP / OpenRewrite LST）** — https://www.thoughtworks.com/radar/techniques/code-intelligence-as-agentic-tooling
  - **temporal fakes（主动注入故障以验证监控与告警）** — https://www.thoughtworks.com/radar/techniques/temporal-fakes
  - **mutation testing（抗"永远绿"测试）** — https://www.thoughtworks.com/radar/techniques/mutation-testing
  - sandboxed execution for coding agents — https://www.thoughtworks.com/radar/techniques/sandboxed-execution-for-coding-agents
  - **MCP by default（Caution，含 "abstraction tax"）** — https://www.thoughtworks.com/radar/techniques/mcp-by-default
  - **agent skills + 供应链风险** — https://www.thoughtworks.com/radar/techniques/agent-skills ／ https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/
  - **toxic flow analysis for AI** — https://www.thoughtworks.com/radar/techniques/toxic-flow-analysis-for-ai
  - **reverse engineering for design system（遗留系统 Uplift）** — https://www.thoughtworks.com/radar/techniques/reverse-engineering-for-design-system
  - **mapping code smells to refactoring techniques（改工作流而非改 diff）** — https://www.thoughtworks.com/radar/techniques/mapping-code-smells-to-refactoring-techniques
  - ralph loop — https://www.thoughtworks.com/radar/techniques/ralph-loop ；agent trace（代码归属规范）— https://www.thoughtworks.com/radar/platforms/agent-trace
  - feedback flywheel / skills as executable onboarding documentation / ignoring durability in agent workflows / coding agent swarms（Caution）— 同 quadrant 目录页
  - HTML Tools 出处 — https://simonwillison.net/2025/Dec/10/html-tools/
- **Cognition《Introducing FrontierCode》2026-06-08**（唯一以"代码质量 / 可 merge 性"为基准，含 reverse-classical、`mutagent`、Code Scope 三种验证器）— https://cognition.com/blog/frontier-code
- LangChain《The Anatomy of an Agent Harness》2026-03-10 — https://blog.langchain.com/the-anatomy-of-an-agent-harness/
- HumanLayer《Skill Issue: Harness Engineering for Coding Agents》2026-03-12 — https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents
- HumanLayer《Why Software Factories Fail》2026-07-22 — https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/wsff.md
- Addy Osmani《Agentic Code Quality》2026-08-08 — https://addyosmani.com/blog/agentic-code-quality/
- StrongDM factory（2026-02-06，当事人自述，未核验）— https://factory.strongdm.ai/ ／ https://factory.strongdm.ai/principles.md ／ https://factory.strongdm.ai/techniques.md
- Simon Willison 对 StrongDM 的分析 — https://simonwillison.net/2026/Feb/7/software-factory/
- Geoffrey Huntley《Ralph Wiggum as a "software engineer"》2025-07-14 — https://ghuntley.com/ralph/

**论文**
- Meta-Harness, arXiv 2603.28052（COLM 2026）— https://arxiv.org/abs/2603.28052 ／ https://yoonholee.com/meta-harness/ ／ https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact
- ETH Zurich《Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?》arXiv 2602.11988 — https://arxiv.org/abs/2602.11988
- ByteDance Seed《Harness-IF: Evaluating Instruction Following Across Instruction Surfaces in Coding Agents》2026-08-12 — https://seed.bytedance.com/en/public_papers （字节 2026 年唯一与 harness engineering 沾边的一手产物）

**规范与实物仓库**
- Nebula Security SandboxGym 审计 — https://sandboxgym.io/
- Docker Sandboxes — https://docs.docker.com/ai/sandboxes/ ／ 隔离模型 https://docs.docker.com/ai/sandboxes/security/isolation/
- Blueprint Alliance — https://blueprintalliance.ai/
- Kubernetes SIG Apps agent-sandbox — https://github.com/kubernetes-sigs/agent-sandbox
- smol-machines/smolvm — https://github.com/smol-machines/smolvm
- 阿里 OpenSandbox — https://github.com/opensandbox-group/OpenSandbox
- Agentic AI Foundation — https://github.com/aaif ／ https://aaif.io/
- **AAIF Taxonomy & Landscape Workstream（术语表制度化，含 CI 校验器）** — https://github.com/aaif/ws-taxonomy-landscape
- **agentgateway（LLM/MCP/A2A 三层网关 + Inference Routing + CEL RBAC，Linux Foundation）** — https://github.com/agentgateway/agentgateway
- **NVIDIA OpenShell** — https://github.com/NVIDIA/OpenShell ／ https://build.nvidia.com/openshell
- **Open Knowledge Format (OKF) 规范** — https://okf.md/spec/
- **阿里 OpenSandbox** — https://github.com/opensandbox-group/OpenSandbox
- **Data Olympus（Git-native 知识库：validity windows + supersession chains）** — https://github.com/knaisoma/data-olympus
- **Deterministic Context Routing** — https://github.com/ai-erp-collab/deterministic-context-routing
- **plasma-ai/wiki（并行编辑合并的 Markdown 知识库）** — https://github.com/plasma-ai/wiki
- **Uni-CLI（711 条声明式 pipeline / 134 站点 / ~80 token 每调用）** — https://github.com/olo-dot-io/Uni-CLI
- **walkinglabs/awesome-harness-engineering（141 条分类索引，CC0，含大量独立 harness 实现）** — https://github.com/walkinglabs/awesome-harness-engineering
- Greenfield AI / Brownfield AI 分型方法论（棘轮 hook + lint 基线化）— https://sawinyh.com/blog/greenfield-vs-brownfield-ai-codebases
- walkinglabs/learn-harness-engineering（教学聚合，16.6k★）— https://github.com/walkinglabs/learn-harness-engineering
- walkinglabs/awesome-harness-engineering（分类索引，4.2k★，CC0）— https://github.com/walkinglabs/awesome-harness-engineering
- kunchenguid/grok-ship（5 commit 的 markdown 包，已自标 superseded）— https://github.com/kunchenguid/grok-ship

**X 侧一手/线索（附日期与参与度）**
- @dexhorthy 提出 "harness engineering" 命名 2025-11-04（588 赞）— https://x.com/dexhorthy/status/1985699548153467120
- @dexhorthy「10 things i learned about harness engineering」2026-03-14（151 赞 / 22 转）— https://x.com/dexhorthy/status/2032524853530832921
- @poteto（Cursor）Projects 2026-09-11（1,347 赞）— https://x.com/poteto/status/2098165460714057863
- @UberEng 效率数据 2026-08-28（199 赞）— https://x.com/UberEng/status/2093460881040658537
- @_lopopolo（OpenAI）pre-tool-use hook 拦截 `grep -r` 改 ripgrep 2026-09-23 — https://x.com/_lopopolo/status/2102552111284371484
- @rauchg 关于 microVM 隔离与 Kimi 论文 2026-08-10（225 赞）— https://x.com/rauchg/status/2086946535716393209
- @nebusecurity 沙箱审计公告 2026-08-10（69 赞 / 22 转）— https://x.com/nebusecurity/status/2086939881335607608
- @Docker 加入 Blueprint Alliance 2026-09-22（37 赞）— https://x.com/Docker/status/2102382560403710135
- @hongming731 引荐阿里手册 2026-09-25（133 赞）— https://x.com/hongming731/status/2103308233867956643
- @Xudong07452910 引荐《Why Software Factories Fail》2026-07-28（543 赞 / 104 转）— https://x.com/Xudong07452910/status/2082028299275149685
- @undefinedKi DoorDash Flux 转述 2026-08-12（751 赞 / 90 转）— https://x.com/undefinedKi/status/2087585693547598310
- @KanikaBK grok-ship 转述 2026-09-12（35 赞 / 13 转）— https://x.com/KanikaBK/status/2098729339718430762

---

## 10. 可抄作业清单与落地陷阱（横向结论）

### 10.1 可直接借鉴的亮点（按投入产出比排序）

1. **`AGENTS.md` 当目录页，不当手册** —— 约 100 行，映射到 `docs/` 树；执行计划（`exec-plans/active|completed`）升为一等资产。（OpenAI）
   - **对照证据**：ETH Zurich（arXiv 2602.11988）证明 **LLM 生成的 context file 反而降低表现、推理成本 +20%**；仓库概览/目录清单"are not helpful"，agent 自己能发现仓库结构。→ **只写非标准约定，别写架构概览。**
   - 陷阱：会腐化 → 需 doc-gardening agent 定期开修复 PR。
2. **结构化状态文件 + 只允许改一个字段** —— `feature_list.json`（200+ 功能全 `passes:false`，**只允许动 `passes`**）、`claude-progress.txt`、`init.sh`；选 JSON 而非 Markdown 的理由是"模型更不容易乱改 JSON"。（Anthropic）
   - 配套"恢复仪式"：`pwd` → 读 git log + progress → 读 feature list → 选最高优先级未完成项 → 跑 `init.sh` → **先复测基础功能再动新活**。
3. **前馈 guide / 反馈 sensor 双轨**（Fowler / ThoughtWorks Vol 34）
   - **computational 优先**（linter/类型检查/结构测试，毫秒到秒、确定性），inferential 只补语义判断；
   - **sensor 输出要针对 LLM 消费优化**——lint 报错文本内嵌修复指令，作者称之为"a positive kind of prompt injection"；
   - 陷阱：**只有前馈 = 编码了规则却从不验证；只有反馈 = 反复犯同一个错**。
4. **back-pressure 必须 context-efficient** —— 成功静默、失败才输出；全量测试的 4,000 行通过日志会淹掉上下文并让 agent 开始幻觉（HumanLayer 亲历）。
   - 门禁必须接 CI/CD：**"没有接入流程的门禁，本质上只是一个建议"**（美团）。
5. **三态门禁 `PASS / BLOCKED / UNKNOWN`**（阿里 Guardrail）—— 规则版本化（Spec revision + digest）、动作上下文不可变（ChangeSet 快照不可覆盖）、逐项提交证据；**聚合由确定性程序机械完成，LLM 不解释业务语义**；**UNKNOWN 不得当 PASS**；目标或上下文一变，旧结论立即失效。
6. **凭证永不进沙箱**：沙箱只见占位值，真实凭据由**可信出站代理按"域名 + 路径 + 方法"匹配后注入**（Docker Sandboxes / smolvm / OpenShell / OpenSandbox 四家设计一致）。
   - 陷阱一：**凭证状态不能进快照**，恢复后由控制面重新注入（阿里明文）。
   - 陷阱二：**allowlist 是"能力授予"不是"目的地过滤器"**——放行 `api.anthropic.com` 等于放行任意 Anthropic 账号的文件上传（Anthropic 真实外泄复盘）。
   - 陷阱三：SSH agent forwarding 与剪贴板是常见的默认放松点（Docker 已披露）。
7. **MCP 工具投影为 CLI** —— Uber 把 1,000+ 内部 MCP 工具统一投影成 CLI 命令；HumanLayer 用自写 Linear CLI 替代 MCP server（"saved us thousands of tokens"）；Cloudflare Code Mode 把 GitLab 的 34 个 schema（约 15,000 token = 200K 窗口的 7.5%）压成 2 个 portal 工具。
   - 收益量化：Uber code-mode 省 **55%–100%** token；MCP 预载在 100+ 工具时吃 **50K–70K token/轮**。
   - 前提：**CLI 必须配 Skill 告诉 agent 何时调用**——"Agent 并没有主动发现 CLI 的机制"（阿里）。
8. **按结果计价，不按 token 单价** —— Uber：cost per merged PR / review / alert / cleanup + revert rate + MTTR；DoorDash：`$3/review`、`$3.91/PR`、`725s/PR`。
   - 陷阱：**接受率只填满混淆矩阵的两格**（无假阴性、无真阴性）→ 必须建带人工标注 / 生产反馈 / 判官分歧审计的三角基准（DoorDash DashBench；召回 53.6% / 精确 87.0% 才是可信画像）。
9. **评测的双层与对齐方法**（美团）—— 端到端评测集（事办成了吗）+ 过程评测集（中间哪步坏了）；**Rubric 二元化**（是/否/未知）；**用 unknown 占比反查 Rubric 定义是否合理**；人机一致率到 85%–90% 之前"只能叫机器标注，不能叫自动化评测"。
   - 陷阱：**只走 Agent 迭代 Loop 会把 agent 优化成迎合评测标准，而非解决用户问题**。
10. **隔离强度按用户能力匹配**（Anthropic）—— 会读 bash 的开发者 → HITL 沙箱（权限提示削减 84%）；非技术知识工作者 → 密封 VM（凭证留宿主 keychain）。
    - 陷阱：**隔离会一并挡住 EDR**，合规要求端点可见性的团队需要提前预算这场对话，代偿方案（OTLP 拉取式导出）不是实时监控。

### 10.2 落地前置条件（缺一项就上不去）

| 前置条件 | 依据 |
|---|---|
| **可复现的运行环境定义**（运行时 / 仓库 / 初始化步骤 / 依赖适配器 / 数据基线 / 网络边界 / 验证命令，写成可评审的一份声明） | 阿里 Coding 环境：缺环境上下文则"代码改对了，项目仍跑不起来" |
| **统一资源模型 + 上下文解析**（解决"模型是否知道自己该操作哪个对象"） | 阿里："MCP 解决了模型如何调用工具，却没有解决这个"；现有工具只报"发生了什么"，不报"下一步能做什么" |
| **Trace / Trajectory 可观测基建** | 美团："观测 + 评测 = 持续迭代"，观测排在评测之前；"看不见的问题，几乎不可能被稳定解决" |
| **沙箱供给能力**（网络是隐藏天花板） | 阿里云：单 VPC 15,000+ ENI、ENI 创建 <100ms、1,000,000 弹出/分钟；NAT GW EIP 池 ≤256/实例 |
| **身份与委托体系**（`有效权限 = 用户 ∩ Agent 上限 ∩ 平台策略 ∩ 委托范围 ∩ 运行时约束`） | 阿里四对象分离（认证/委托/策略授权/凭证）+ PDP/PEP/Credential Broker |
| **组织侧评价系统先改** | 阿里："口头说判断比执行值钱，但 KPI 还是产出量，员工不会信"；否则知识藏匿直接使 harness 工作无法完成 |

### 10.3 成本陷阱（预算级）

- **harness 会让成本上一个数量级**：同一模型、同一 prompt，裸跑 `20 分钟 / $9` vs 完整 harness `6 小时 / $200`（Anthropic，Opus 4.5）。
- **拆多 agent ≠ 省钱**：拆成 6 个 sub-agent 意味着 6 份 system prompt 同时计费（腾讯自曝）；真正的收益来自"把雪球分段"。
- **评测噪声会吃掉结论**：仅资源分配差异即可造成 **6pp** 成功率跨度；**低于 3pp 的 leaderboard 差异在配置公开前不可信**（Anthropic）。
- **稳定性是系统性负相关**：DORA 2025 起 AI 采纳与交付吞吐转正相关，但**与交付稳定性仍为负相关**（采纳 +25% → 稳定性 −7.2%）；Faros AI 22K 开发者遥测显示每 PR 事故 +242.7%、churn +861%。**这两条不是可以用 harness 一键消除的，需要专门的验证预算。**
- **prompt caching 的 TTL 选择是钱**：cache read 0.1×，但写入溢价 5 分钟 1.25× / 1 小时 2×——交互主 session 用 1 小时、subagent 用 5 分钟是 Uber 实测的平衡点。

### 10.4 反模式清单（明确别做）

| 反模式 | 谁踩过 / 谁警告过 |
|---|---|
| 预装几十个 skill 与 MCP server "以防万一" | HumanLayer：`"I have thrown away many more hooks than we actually use today"` |
| 为 subagent 微调工具白名单 | HumanLayer：导致 tool thrash，结果更差不是更好 |
| 每次 agent 结束跑全量测试 | HumanLayer：4,000 行通过日志淹掉上下文 |
| 用 coding throughput 当生产率指标 | ThoughtWorks Vol 34 直接列 Caution |
| 把需求一次性扔给 agent 写几千行再 review | Horthy：`"most AI oneshot PRs trend closer to 50%"` 需要返工 |
| 用接受率单一指标衡量 review agent | DoorDash：接受率只覆盖混淆矩阵两格 |
| 让 agent 通过 Web UI 模拟人的操作 | 阿里：页面改版/登录流程一变就中断；"需要的不是更多 API，而是一套统一稳定的访问方式" |
| 把 "harness engineering" 当成能解决 maintainability 的银弹 | Horthy：**harness 只提升下限，不移动上限**（上限由 RL 教了什么决定） |
| 全自动"关灯工厂" | Horthy 实测三个月后决定重写；StrongDM 至今无公开效果数据 |
