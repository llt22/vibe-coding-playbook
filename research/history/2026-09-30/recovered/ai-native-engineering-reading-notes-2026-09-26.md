# 七份外部资料综合笔记：项目历史副本

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及提问所在项目的限制只属于当时上下文。

来源：`~/WebstormProjects/private-project/docs/ai-native-engineering-reading-notes.md`；原文核对日期：2026-09-26。原文中的原项目约束只适用于原项目，不约束本研究项目。原项目相对链接已转换为来源定位。

---

# AI Native 研发范式外部资料梳理

状态：研究证据。本文汇总一批外部文章、规范和书稿中关于 AI 研发落地的共识与分歧，并对照原项目边界给出吸收判断，是 AI-native 产品交互方向 §2（`~/WebstormProjects/private-project/docs/ai-native-interaction-direction.md#2-为什么改变方向`） 的外部依据；本文不是任务领取入口，不自动改变原项目产品范围。实际任务仍只能从当前计划（`~/WebstormProjects/private-project/docs/current-plan.md`）领取，新增概念或页面前仍须按产品开发原则 §10.1（`~/WebstormProjects/private-project/docs/product-development-principles.md#101-产品面准入检验`）做准入检验。

核对日期：2026-09-26

## 1. 结论先行

1. 各方共识高度收敛：编码已不是瓶颈，瓶颈在环境、上下文、验证证据、权限与组织流程。AI 是现有工程底座的放大器，不能替代它。
2. 可落地的工程形态是 Harness：AI 负责认知，确定性程序负责编排与执行；长链路状态落盘，不依赖会话记忆；权限声明化、可审计、最小化。
3. 人工逐行 Review 在 Agent 批量产出下必然崩溃。解法是前置定义机器可判定的证据与分级放行规则，缺陷反复出现时改工作流，而不是逐个修 Diff。
4. 对原项目而言，这批资料主要**印证**现有边界（平台只做 Policy、Approval、Audit 与执行事实，不判断业务正确性），可吸收的是权限声明与证据聚合的机制细节，不是新的产品面。

## 2. 资料清单

| 资料 | 来源性质 | 视角 | 本文使用方式 |
|---|---|---|---|
| 阿里《AI Native 研发范式实践手册》 | 企业内部白皮书 | 平台 / 管理层，自顶向下 | 架构分层、三态门禁、权限交集模型 |
| 腾讯《从 AI Coding 到 Harness Engineering》（[知乎转载](https://zhuanlan.zhihu.com/p/2056025288866378509)） | 业务团队一线复盘 | 工程实现，自底向上 | 状态驱动编排、知识库保鲜、并行冲突治理 |
| [Docker Sandbox Kit Spec](https://www.docker.com/blog/docker-sandbox-kit-spec/) | 基础设施规范 | 运行时隔离与权限 | Authority as Code |
| [AI Coding Dictionary: Software Factory](https://www.aicodingdictionary.com/?term=software-factory) | 概念词典 | 术语与研发形态 | 术语对齐 |
| O'Reilly《Scaling AI Adoption in Engineering》（Early Release，前言与第 1–4 章） | 管理类书稿 | CTO / 组织变革 | 组织前提与落地节奏 |
| [Anthropic: How to prepare for AI-driven code modernization projects](https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects) | 厂商现场手记 | 大型改造项目治理 | Certificate 与 Promotion Policy |
| [Hyper-Extract](https://github.com/yifanfeng97/Hyper-Extract) | 开源工具 | 文档到结构化知识 | 仅记录，和本主题关联弱 |

## 3. 共识

### 3.1 瓶颈转移

- 阿里：Agent 无法交付，主因是拿不到环境、调不通内网、跑不起验证、过不了门禁。
- O'Reilly：大量企业采购 Copilot 后 ROI 为零甚至为负；成功组织的共同点是测试覆盖、CI/CD、Feature Flag 和 DevEx 本就成熟。
- Anthropic：大型改造中验证消耗的 Token 远多于写代码。

### 3.2 AI 负责认知，程序负责执行

- 腾讯从“主 Agent 调子 Agent”和“LLM 生成 Shell 脚本”退回到 Go 强类型主调度器：代码决定流程，只在需要推理时唤起 Agent；禁用全局 Memory，保持子任务幂等。
- 阿里把企业系统入口从 Web UI 反转为 Agent 可调用的声明式 CLI / API，让输入输出确定。
- Software Factory 把启动 Agent 的动作从“人手动开会话”换成触发器（Issue、Cron、CI 失败、上游完成），人只在需要决策处介入。

### 3.3 状态落盘，不依赖会话

- 腾讯用 `product-state.json` / `e2e-state.json` 作为唯一事实源，配合 Stop Hook 拦截 Agent 未达终态就宣告完成，SessionStart Hook 断点续传。
- 词典中的 Attention Budget 概念解释了原因：上下文越长，注意力越稀释。

### 3.4 证据代替人工逐行审查

| 来源 | 机制 | 要点 |
|---|---|---|
| 阿里 | Guardrail 三态 | PASS / BLOCKED / UNKNOWN，UNKNOWN 不等于 PASS；平台只聚合机器证据并执行确定规则 |
| Anthropic | Certificate | 无人工介入即可判定的证据集合：原有测试、增量测试、独立上下文的对抗审查、差分测试与流量回放；上线前与业务负责人共同确认 |
| Anthropic | Promotion Policy | 按爆炸半径与置信度分级放行；专家精力前置到凭证设计和抽样；改工作流不改单个 Diff |
| 腾讯 | 串行收口 | 能事前隔离的隔离，必须共享的（入口文件、Proto、DB、配置）串行收口 |

### 3.5 权限声明化与最小化

- 阿里五层交集：有效权限 = 用户权限 ∩ Agent 能力上限 ∩ 平台策略 ∩ 委托范围 ∩ 运行时约束，高风险动作走 Challenge 二次确认。
- Docker：权限写进 OCI 镜像注解，网络按域名与方法细粒度声明，否定规则优先；凭据由宿主 Proxy 注入，Agent 只见哨兵值；权限外扩在 PR Diff 中可见、可拦截。MicroVM 而非共享内核容器。
- Anthropic：Agent 在专用主机运行，只有改造分支写权限，不给生产凭据。

## 4. 分歧与风险

1. **前提成本**：声明式沙箱和自动化凭证都要求工程底座成熟。存量系统的配置漂移、隐性内网依赖会先吃掉投入（阿里、O'Reilly 均承认）。
2. **验证吞噬提效**：测试覆盖不足时，产出压力转嫁给资深工程师人工找茬，整体吞吐可能下降。
3. **知识库维护成本**：腾讯 800+ 份服务文档靠 Git Hash 增量保鲜仍需人力修正；“过期知识比没有知识更危险”。
4. **能力退化**：阿里与 O'Reilly 都提到初中级工程师失去成长路径，均未给出解法。
5. **提效数字不可直接采信**：白皮书和书稿中的百分比多为宣传或虚构案例（O'Reilly 第 1 章两家公司为虚构画像）。

## 5. 对照原项目边界

依据 AGENTS.md（`~/WebstormProjects/private-project/AGENTS.md`） 的不可越过边界与 AI-native 产品交互方向（`~/WebstormProjects/private-project/docs/ai-native-interaction-direction.md`）。表中「候选」与「需单独评估」项不自动成为任务，出现真实触发时从当前计划（`~/WebstormProjects/private-project/docs/current-plan.md`）登记。

| 外部机制 | 与原项目的关系 | 判断 |
|---|---|---|
| AI 操作草稿、人批准高风险动作、平台执行 Policy 与审计 | 与方向 §1 裁决（`~/WebstormProjects/private-project/docs/ai-native-interaction-direction.md#1-裁决`）、§3 决策权归属（`~/WebstormProjects/private-project/docs/ai-native-interaction-direction.md#3-决策权归属`）一致 | 印证，无需新增 |
| 状态落盘、Run 终态由程序判定 | 已由 Run / Attempt / Event 承载；`succeeded` 只表示程序执行完成 | 印证，无需新增 |
| 三态门禁中的 UNKNOWN ≠ PASS | 可作为 Publish 与 Policy 校验的设计约束：依赖或审批状态缺失时不得放行 | 可吸收为约束，落地前核对现有实现 |
| 五层权限交集、Challenge | 落在权限、Policy、Approval 范围内 | 可作为权限模型参考，需单独评估 |
| 权限声明随版本不可变、权限外扩在版本 Diff 中可见 | 落在 Definition 不可变版本与 Publish 校验范围内 | 候选，需按 §10.1 准入 |
| 凭据代理注入、Agent 只见哨兵值 | 与外部 Agent 平台实践审计 §5.3（`~/WebstormProjects/private-project/docs/external-agent-platform-practices-audit.md#53-run-级短期能力令牌与可信-gateway`） Run 级短期能力令牌方向相近 | 合并到该条目评估，不另立 |
| Certificate 的业务正确性判定、通过率、质量门槛 | 属于 Eval / Verdict / 质量门槛，平台不得拥有 | 明确不进入 Core、公共契约、默认 UI 或平台 Skill |
| Software Factory 触发器驱动 | 与 Schedule / 事件触发相关 | 不在当前范围，出现真实需求再评估 |
| 结构化知识库、Hyper-Extract 类抽取 | 与平台核心对象无关 | 不吸收 |

## 6. 证据边界

- 阿里白皮书为用户提供的材料，本文未核对原始出处与版本。
- 腾讯文章读取自知乎转载，未核对原发渠道。
- O'Reilly 书稿为 Early Release，只覆盖前言与第 1–4 章，Part 2 / Part 3 仅有目录。
- 以上资料均未读取实现代码，结论只作方向参考，不作为原项目代码现状或合同依据。
