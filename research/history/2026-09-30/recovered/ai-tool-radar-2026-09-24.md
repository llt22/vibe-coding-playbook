数据收集完毕，以下是完整报告。

---

# AI Tool Radar — 2026-09-01 至 2026-09-24

扫描范围：AI Agent 开发工具、编码 Agent、MCP 生态、Agent 基础设施。来源覆盖 GitHub Trending、Hacker News、DEV Community、V2EX、多个聚合排名站。

---

## Try Now — 成熟度足够，有独立采纳证据

### 1. Orca — Agent 开发环境 (ADE)
- **仓库**: [stablyai/orca](https://github.com/stablyai/orca) | 75k+ stars | Apache 2.0
- **是什么**: 多 Agent 并行舰队指挥台。每个 Agent 跑在独立 Git worktree，支持 Claude Code / Codex / OpenCode / Grok 等 40+ CLI Agent 并排运行
- **核心能力**: worktree 隔离、diff review + 批注回传 Agent、用量追踪与账号热切换、桌面+移动端
- **采纳证据**: 5 个月 43k→75k stars，GitHub Trending 连续上榜，多个独立评测（[AgentConn](https://agentconn.com/agents/orca/)、[DEV Community](https://dev.to/arshtechpro/orca-explained-the-agent-development-environment-for-running-ai-coding-agents-in-parallel-440n)）
- **定位**: 管理层（worktree / terminal / diff），不碰 Agent 内核（memory / tool routing / guardrail），因此可与任何 Agent 的 harness 组合
- **风险**: 不控制 Agent 行为安全，只做环境隔离

### 2. RTK (Rust Token Killer) — Agent Token 压缩代理
- **仓库**: [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | 81k+ stars | Rust 单二进制
- **是什么**: 拦截 Bash 命令输出，用 smart filtering / grouping 压缩后再传给 Agent，减少 60-90% token 消耗
- **为什么值得用**: 内置 100+ 命令过滤器，支持 14 种 AI 编码工具，`rtk init -g` 一键接入 Claude Code
- **采纳证据**: 81k stars，843 贡献者，多个独立测评确认效果（[DEV](https://dev.to/arshtechpro/how-rtk-reduces-llm-token-usage-for-ai-coding-agents-2kfd)、[MadPlay](https://madplay.github.io/en/post/rtk-reduce-ai-coding-agent-token-usage)）
- **风险**: 压缩可能丢失 Agent 需要的细节；不改善模型能力本身

### 3. Amp (Sourcegraph) — 语义代码图编码 Agent
- **站点**: [sourcegraph.com/amp](https://sourcegraph.com/amp)
- **是什么**: 从 Cody 重塑而来，利用 Sourcegraph 代码搜索和索引提供跨仓库语义理解。三模式（Rush / Smart / Deep），自动 subagent 分派，context compaction 无限延续
- **9 月动态**: 9/22 worktree 自动创建、9/17 多目录 runner、9/13 免费 BYOK 层（[G2 评价](https://www.g2.com/products/amp-code-amp/reviews)）
- **采纳证据**: 4 万+ 团队采用，G2 / Slashdot / [lowcode.agency](https://www.lowcode.agency/blog/claude-code-vs-amp-code) 多个独立比较评测
- **定位**: 大型企业单体仓库场景最强；个人项目未必比 Claude Code 有优势
- **风险**: 依赖 Sourcegraph 基础设施，虽有 BYOK 但核心索引不开源

### 4. Mole — 终端深度研究 Agent
- **仓库**: [lajosdeme/mole](https://github.com/lajosdeme/mole) | Go | 静态二进制
- **是什么**: 终端运行的深度研究 Agent，强制预算、引用验证、本地数据隐私边界、MCP 支持
- **工作方式**: 分解问题 → 搜索 → 读源 → 提取声明 → 逐条对照原文验证 → 带引用写答案
- **亮点**: 每次模型调用先预扣预算再结算，本地数据不出机，可作为编码 Agent 的 MCP 工具
- **采纳证据**: [HN Show HN](https://news.ycombinator.com/item?id=49303046) 获得关注，独立技术文章覆盖
- **风险**: 早期项目，star 数不高，社区尚小

---

## Study — 有价值的思路或架构，但未必可直接上手

### 5. Jev (TypeSafe AI) — System One 模型
- **站点**: [typesafe.ai](https://typesafe.ai/blog/introducing-system-one-models-and-jev) | 9/15 早期访问 | API 9/21 开放
- **是什么**: 不生成文本，接收状态 + 类型化问题，并行采样后返回带校准概率的类型化决策。$0.042/M input tokens，output 免费
- **性能**: 67.8% 四工作流评测（≈GPT-5.6 Terra），比 Opus 5 低 5pp，但成本/延迟低约 200x/50x（[Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/typesafe-ais-jev-offers-an-alternative-to-llms-that-claims-to-be-193x-faster-and-445x-cheaper-system-one-type-model-is-bespoke-for-probabilistic-decision-making)）
- **适用场景**: 分类、路由、评分、提取——Agent 内部决策节点，非对话
- **背景**: 创始人 Diogo Almeida (前 OpenAI，ChatGPT 指令遵循研究)，$40M 种子轮 DCVC 领投
- **风险**: 不开源权重，不提供自托管；"无幻觉" 是 schema 保证而非正确性保证；仅一个生产案例 (Metaview)

### 6. Google AX — Kubernetes 风格 Agent 编排运行时
- **仓库**: [google/ax](https://github.com/google/ax) | 2k stars | Apache 2.0 | Go
- **是什么**: 9/18 I/O 发布。四原语 (Task / Workspace / Gateway / Model)，YAML 声明式部署 Agent，sandbox 执行，checkpoint suspend/resume，audit logging（[InfoQ](https://www.infoq.com/news/2026/09/google-ax-orchestrator/)）
- **为什么值得研究**: Kubernetes 式 Agent 编排是明确趋势；Google 基础设施团队主导 (rakyll)；CLI 仿 kubectl
- **风险**: 明确标注 early-stage + breaking changes；面向平台团队，单开发者用不上

### 7. Huzzah — 持久伪代码驱动的 AI 编码
- **作者**: [Daniel Vaughn](https://www.danielvaughn.dev/posts/huzzah/) | HN 8/20
- **核心思路**: 用 `.hz` 伪代码文件替代瞬时 chat 指令，declarative + persistent vs imperative + transient
- **为什么关注**: 对 "Agent 疲劳"（反复用自然语言描述同一意图）提出了结构性回应
- **风险**: 纯实验，无融资无用户数据无正式版本

### 8. Caspian SDK — Agent-to-Human 通信层
- **仓库**: [snow884/caspian-sdk](https://github.com/snow884/caspian-sdk) | Python & TypeScript
- **是什么**: 一次集成让 Agent 在 Slack / Discord / Telegram / Email / WhatsApp / X 上以统一身份对外沟通
- **为什么关注**: A2A / ACP 连接 Agent 之间，Caspian 填 Agent→人 的通信缺口；已办 [$14.5k 黑客松](https://caspian.devpost.com/)
- **风险**: 早期，身份/凭据管理是敏感面

---

## Watch — 早期或快速变化中

### 9. Statewright — 可视化状态机提升 Agent 可靠性
- **HN**: [Show HN](https://news.ycombinator.com/item?id=48108778) (5 月) | 作者背景 NVIDIA / AMD
- **思路**: 用可视化状态机替代 "更大模型 + 更长 prompt" 的蛮力可靠性方案
- **当前**: 讨论阶段，无广泛采纳证据

### 10. Golutra v0.3.3 — 轻量 Agent Harness
- **来源**: [V2EX](https://www.v2ex.com/t/1244557)
- **思路**: "Harness 不应是 Agent 的负担，而是 Agent 的操作系统"；主打 Token 高效、可观测
- **当前**: 中文社区关注，国际采纳未知

### 11. GitHub HydraFusion — Copilot CLI 多模型编排
- **状态**: 9/4 research preview，动态在三种执行模式间切换模型
- **声称**: TerminalBench 2.1 / DeepSWE / CheckpointBench 对标 Opus 5，token 成本低 36-67%
- **当前**: preview 阶段，非 GA

---

## Avoid for Now — 风险或不成熟

### MCP 生态安全现状
- 4 月 OX Security 披露 MCP SDK stdio transport 系统级 RCE（影响所有语言 SDK，[估计 1.5 亿+ 下载](https://www.builder.io/blog/best-mcp-servers-2026)）
- BlueRock 审计：36.7% 公共 MCP server 有 SSRF，41% 无认证，仅 8.5% 用 OAuth
- **建议**: 使用 MCP server 前逐个审查认证和网络边界；不要盲信社区 server

---

## 扫描无法覆盖的渠道

- Reddit 特定 subreddit 帖子细节（搜索覆盖但未逐帖展开）
- 项目 Discord 频道内部讨论
- 部分 V2EX / 掘金帖子因时效无法确认更新状态
- skills.sh 目录本次未单独检索

## 趋势信号

1. **ADE (Agent Development Environment)** 是本月最大叙事——开发者的瓶颈已从 "用哪个模型" 转向 "怎么管理同时跑的五个 Agent"
2. **Token 效率** 成为实用层面的高优先级（RTK 81k stars 说明痛点真实）
3. **Agent 编排正在 "Kubernetes 化"**——Google AX、Orca、Temporal 式编排都在争夺这个层
4. **非文本模型** (Jev) 开辟了 Agent 内部决策节点的新品类，值得架构师关注
5. **中文社区** Agent 工具活跃度明显上升，V2EX 已设专区，asAgent / Golutra / ClawBot 等本土项目涌现

Sources:
- [OSSInsight AI Trending](https://ossinsight.io/trending/ai)
- [Orca on GitHub](https://github.com/stablyai/orca)
- [RTK on GitHub](https://github.com/rtk-ai/rtk)
- [Amp by Sourcegraph](https://sourcegraph.com/amp)
- [Mole on GitHub](https://github.com/lajosdeme/mole)
- [Jev launch — MarkTechPost](https://www.marktechpost.com/2026/09/19/typesafe-ai-releases-jev/)
- [Google AX — InfoQ](https://www.infoq.com/news/2026/09/google-ax-orchestrator/)
- [Huzzah — HN](https://news.ycombinator.com/item?id=49378768)
- [Caspian SDK](https://github.com/snow884/caspian-sdk)
- [MCP security concerns — Builder.io](https://www.builder.io/blog/best-mcp-servers-2026)
- [Morphllm coding agent leaderboard](https://www.morphllm.com/best-ai-coding-agents-2026)
- [V2EX AI Agent 板块](https://www.v2ex.com/go/agent)