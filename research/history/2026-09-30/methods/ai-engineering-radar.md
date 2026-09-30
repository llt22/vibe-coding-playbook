# 方法快照：ai-engineering-radar

保存日期：2026-09-30。来源：`~/skills/ai-engineering-radar/SKILL.md`。

这是研究归档中的文本快照，不是新安装的 Skill，不改变个人正本、触发条件或本仓库工作规则。正文中的执行、审批、顾问流程均为待研究材料。

````markdown
---
name: ai-engineering-radar
description: "Discover, track, and evaluate cutting-edge AI Engineering, Harness Engineering, Agentic SDLC practices, enterprise playbooks, engineering whitepapers, and agent-infrastructure tools/specs. Use when searching for real-world AI software engineering methodologies, harness architectures, and case studies."
---

# AI Engineering & Harness Radar

专门用于发现、追踪和研判 **AI 研发工程化（AI Engineering）**、**Harness Engineering**、**Agentic SDLC（智能体软件开发生命周期）**、**软件工厂（Software Factory）** 及 **智能体研发基础设施/规范** 的前沿信息与实战案例。

---

## 一、 核心追踪领域与主题

本 Skill 聚焦于"将大模型与 Agent 纳入严肃软件工程"的核心命题，重点监测以下 6 个维度：

1. **Harness Engineering 与流程编排**：
   - 状态文件驱动（State-file / JSON SSOT）、Hook 门禁机制、防偷懒早退控制；
   - 强类型调度编排（如 Go/Rust/Python 程序取代纯 Prompt 调度）、主子 Agent 隔离；
   - DAG 拓扑编排、多 Agent 并发与 Git Worktree 隔离、分支合并与冲突治理。
2. **知识与上下文工程（Context & Knowledge Engineering）**：
   - 结构化知识库金字塔、渐进式检索与加载（按需读取 vs 暴力全量）；
   - 代码知识提取（AST 解析、Proto/接口映射、架构拓扑）；
   - 知识库保鲜与版本溯源（Git Hash 差异检测、增量更新、保留人工批注、文档级回滚）。
3. **验证闭环与发布门禁（Verification & Guardrails）**：
   - 机器凭证（Certificate of Correctness）、差分测试（Differential Testing）、流量回放；
   - 对抗性审查（Adversarial Review）、三态门禁（PASS / BLOCKED / UNKNOWN）；
   - 分级放行策略（Promotion Policy）、SME（领域专家）精力前置、改工作流而非改单个 Diff。
4. **安全沙箱与权限即代码（Security, Sandboxes & Authority as Code）**：
   - Agent 隔离环境（MicroVM / Docker Sandboxes / OpenSandbox / 独立运行时）；
   - 权限收敛与声明规范（OCI 镜像权限注解、网络白名单/黑名单、代理注入凭证 Proxy Credentials）；
   - 权限变更审查（Diff 即审查）与 IAM 最小特权交集模型。
5. **企业级实战复盘与组织转型（Enterprise Playbooks & Field Notes）**：
   - 头部大厂与前线工程师落地手记（Anthropic Notes from the Field、腾讯、阿里、字节、美团等）；
   - 组织变革、心理安全感、度量体系（L1/L2/L3 指标）、AX（Agent 体验）与 DX 演进；
   - 遗留系统现代化重构（Uplift / Transform / Reimagine）实践。
6. **Agent-Native 工具与协议规范（Tools, CLIs & Protocols）**：
   - 面向 Agent 友好的 CLI 工具（从 Web UI 反转为确定性 CLI）；
   - MCP（Model Context Protocol）服务器、技能体系（Skills）；
   - 结构化提取、可验证渲染工具（如 Headless 文档引擎、视觉比对、类型化 Schema 工具）。

---

## 二、 信息源雷达与检索策略

### 1. X / Twitter（用 ego-browser）

X 是**一等信源**：一手实战复盘常先出现在 X，几周后才进博客。凡是命题涉及"谁在生产里真的这么干"，SHOULD 用 ego-browser 在 X 上检索一轮。

用 `skill://ego-browser` 打开 X，用用户已登录的会话搜索，不走 `web_search`、不用 Nitter 镜像、不 `read https://x.com/...` 直取（登录墙 + JS 渲染必失败）。搜索页是 SPA，帖子容器是 `article[data-testid="tweet"]`；点赞数取按钮 `aria-label`（`innerText` 只有缩写）；长文要点"显示更多"，译文要点"显示原文"；结果用 `page.evaluate()` 批量提取。

搜索词按"工程名词 + 门槛"组合：

- 参与度门槛 `min_faves:50`、`min_retweets:20` —— 一次滤掉 0 赞噪声。
- 时间窗 `since:2026-01-01`；类型 `filter:links`（通常是论文/博客/仓库）；语言 `lang:zh` / `lang:en`（中英分开跑）。
- 跟 thread：搜索命中的常是第一条，用其 status URL 再打开一次拿完整论证。

值得盯的账号：官号 `@AnthropicAI`、`@OpenAI`、`@Docker`、`@cursor_ai`、`@sst_dev`；研究者 `@simonw`、`@karpathy`、`@mitchellh`、`@swyx`、`@_lopopolo`、`@ghuntley`、`@Vtrivedy10`；中日一线 `@dotey`、`@geekbb`、`@mardehaym`、`@micci1841`。

**X 侧只读**：不发帖、不回复、不点赞、不转推、不关注。需要登录或验证时停下来问用户。

### 2. 顶尖实验室与工程团队官方博客（首要信源）
- **海外前沿**：Anthropic Blog / Research / *Notes from the Field*；OpenAI Engineering Blog / Cookbook；Docker Blog & Specs / CNCF；GitHub Engineering / GitClear；Martin Fowler / ThoughtWorks Technology Radar。
- **国内一线实战**：腾讯技术工程（微信公众号 / 知乎专栏）；阿里技术 / 阿里云开发者社区；字节跳动技术团队 / 美团技术团队 / 百度飞桨与工程团队。
- **行业智库与权威出版物**：O'Reilly Early Releases / Radar；Substack 技术专栏（Latent Space、Pragmatic Engineer、AIHero / Matt Pocock）；深度技术聚合平台只作线索来源，结论必须回溯一手。
- **论文**：arXiv 直读原文（优先 HTML 版，保留图表与代码块）。

### 3. 开源规范与代码仓库（实物信源）
- GitHub Repositories & Specifications（检索 `Harness`, `Agentic SDLC`, `Sandbox Kit`, `MCP`, `Dynamic Workflows`）。
- Trendshift、GitHub Trending（AI/Engineering 领域）。
- 开源协议与标准：OCI、CNCF、AAIF / OpenSandbox、Model Context Protocol。

### 4. 关键词检索矩阵
- **中文**：`Harness Engineering`、`端到端工程开发实践`、`研发范式实践手册`、`状态文件驱动`、`AI代码现代化`、`代码审查门禁`、`知识库工程`、`软件工厂`、`Agent体验`。
- **英文**：`"Harness Engineering"`、`"Agentic SDLC"`、`"Software Factory"`、`"Authority as Code"`、`"Code Modernization" "Certificate"`、`"Dynamic Workflows"`、`"MicroVM sandbox agent"`、`"Promotion Policy"`、`"AX" "Agent Experience"`、`"Adversarial review"`。

---

## 三、 甄别与降噪标准（辨别"真工程"与"水文"）

在研判发现的信息时，必须严格区分**有工程深度的硬核资产**与**宣传营销水文**：

| 维度 | ✅ 真实工程价值（Gold） | ❌ 浅层水文/营销（Noise） |
| :--- | :--- | :--- |
| **关注核心** | 架构设计、环境供给、验证闭环、权限控制、状态持久化 | 单纯宣扬"提示词技巧"、"Vibe Coding 速度翻 10 倍" |
| **失败与代价** | 坦诚披露 Token 消耗、上下文爆炸、幻觉排查、组织阵痛、未解问题 | 只有夸大其词的提效百分比，无基线、无对照组、无失败复盘 |
| **交付形态** | 给出具体状态 JSON、Go/CLI 编排架构、三态门禁、YAML 规范、代码库 | 纯概念堆砌、抽象口号、套用旧敏捷名词的换皮 PPT |
| **执行逻辑** | **"AI 负责认知，程序/脚本负责确定性执行"** | 试图把所有业务判断与流程完全甩给单个 Prompt |

X 场景补充判据：带外链 + 有具体数字 + 有失败复盘 = Gold，去读一手；高赞但只有结论且附件是自家 landing page = 营销；正文是外链卡片或带引用上下文的 = 可能是转载，先核对原帖；**自称数字但无外链的标为"当事人自述，未核验"，不作结论支撑**；同一措辞被多个账号复制 = 刷量，回溯最早出处。

---

## 四、 研判与输出框架

对检索并确认有价值的内容，按以下结构化框架输出分析：

```markdown
### 1. 核心定位与背景
- **标题与作者/机构**：（附权威原文 permalink；X 帖给 status 链接 + 日期 + 参与度）
- **核心命题**：（一句话概括其解决的核心研发/工程痛点）
- **工程定位**：（属于：基础设施 / 流程编排 / 知识工程 / 验证门禁 / 组织转型 / 工具规范 中的哪一类）

### 2. 关键架构与核心设计（硬核提炼）
- **核心机制**：（如状态文件设计、DAG 编排、MicroVM 隔离、双模型对抗审查等）
- **解决的具体失效模式**：（如何解决上下文爆炸、AI 偷懒、配置漂移或人肉 Review 瓶颈）

### 3. 行业横向对照与联系
- 与已知标杆（如 Anthropic 6步法、阿里白皮书、腾讯 E2E 实战、Docker Sandbox Kit）的异同与互补。

### 4. 落地实用价值与潜在陷阱
- **可直接借鉴的亮点**：（可抄作业的具体设计）
- **落地前置条件与成本陷阱**：（需要哪些前置基建、是否存在技术债阻碍）
```

**输出纪律**：

- 每个判断都能指回 permalink；数字必须带来源与口径。
- 条目数量由证据决定，不为了凑格式逐条填充。
- 报告末尾 MUST 附：**噪声清单**、**覆盖自查**（六维度各覆盖到什么、缺什么）、**关键一手来源链接表**。
- 报告默认落在临时路径，不默认写进任何仓库。
````
