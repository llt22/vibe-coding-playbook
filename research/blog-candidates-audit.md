# 博文选题全面检查基线与状态清单（Baseline Audit）

> **基线建立时间**：`2026-10-03`  
> **基线 Commit**：`149ce98`（docs: 自动调研 3 条）  
> **检查范围**：
> - `playbooks/`：共 28 篇实战可执行手册
> - `experiences/`：共 4 篇实测落地工作流与 SOP
> - `research/radar/`：共 218 篇技术雷达与深度调研报告
> - 对照基准：`ai-blog/src/content/posts/`（共 13 篇已发布/在写博文）
> 
> **渐进式检查原则（后续维护机制）**：
> 1. 本基线已对截至 2026-10-03 的全库 32 篇手册/经验及 218 条雷达完成全量覆盖与分类；
> 2. 后续增量检查只需执行 `git log --since="2026-10-03"` 或 `git diff 149ce98..HEAD --name-only playbooks/ experiences/ research/radar/`；
> 3. 仅对**新生成的手册**或**有重大内容修订的手册**进行增量评估并追加到本清单，无需重复全量扫描。

---

## 一、状态概览统计

| 状态类别 | 数量 | 占比 | 说明 |
|---|---|---|---|
| **完全已发博客** | 3 | 9.4% | 已在 `ai-blog` 中完整成文并发布 |
| **部分涉及（需更新/延伸）** | 3 | 9.4% | 博客已有相关主题，但最新手册的核心实操与反直觉论点尚未展开 |
| **未发布 - S 级推荐（极其契合博客调性）** | 5 | 15.6% | 观点反直觉、痛点尖锐、有完整工程解法与代码/规则，优先撰写 |
| **未发布 - A 级推荐（高价值实战方案）** | 9 | 28.1% | 生产级落地、工具链路清晰、解决常见工程卡点 |
| **未发布 - B 级储备（中度通用选题）** | 7 | 21.9% | 垂直场景优化或通用技巧，适合按需补充 |
| **未发布 - C 级暂缓（过于小众或偏工具配置）** | 5 | 15.6% | 适用面较窄（如广告账户审计、纯本地 Serving 压测） |
| **总计** | **32** | 100% | 28 篇 playbooks + 4 篇 experiences |

---

## 二、全量清单审计明细（32 篇）

### 1. 落地经验与 SOP（`experiences/`，共 4 篇）

| 序号 | 文件路径 | 核心主题与痛点切入（Hook） | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 01 | `experiences/vibe-coding-sop.md` | **Vibe Coding 复杂度管理与人机协作 SOP**<br>痛点：AI 生成代码极快导致架构膨胀失控。<br>解法：人类界定边界、AI 高效填充；不可逆操作红线与强制拆分规则。 | **未发** | **S 级** |
| 02 | `experiences/backend-vibe-workflow.md` | **后端 Vibe 工作流：三条铁律与责任分界线**<br>痛点：AI 极度乐观，写出无幂等、无事务、不可观测的代码。<br>解法：铁律 A（先写不变量再写实现）、铁律 B（先可观测再谈调试）、铁律 C（先可重复交付）。 | **未发** | **S 级** |
| 03 | `experiences/frontend-vibe-workflow.md` | **前端 Vibe 工作流：先有数据契约再写页面**<br>痛点：AI 容易把页面写在沙子上、组件塞满几千行。<br>解法：契约先于 UI、强制处理四态（loading/error/empty/normal）、逻辑与展示硬隔离。 | **未发** | **A 级** |
| 04 | `experiences/design-to-code-workflow.md` | **AI 高质量交付前端 UI：为什么别让 AI 直接看截图？**<br>痛点：AI 看图写代码还原度极差、间距颜色全是猜的。<br>解法：工具提取精确设计 Token，AI 只负责代码重构与自适应编排。 | **未发** | **A 级** |

---

### 2. 可执行手册（`playbooks/`，共 28 篇）

#### 类别 A：工程基础设施、运行时与 Harness
| 序号 | 文件路径 | 核心主题与痛点切入 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 05 | `playbooks/build-agent-from-scratch.md` | **让 AI 持续干活：搭 harness、补生产分层、抓卡死**<br>痛点：Agent 卡死、死循环，只会对着 Prompt 瞎猜。<br>解法：Harness 五件套，引入 Telemetry（Blazo）通过确定性规则（repeated_tool / repeated_error）抓现场。 | **未发** | **S 级** |
| 06 | `playbooks/host-coding-agents.md` | **把编码 Agent 从「随手跑一次」变成「在可控边界里反复跑」**<br>痛点：AI 本机试用爽，进真实项目不敢放手。<br>解法：受控隔离工作区、权限白名单（allow/ask/deny）与 PostToolUse hook 自动化护栏。 | **未发** | **A 级** |
| 07 | `playbooks/web-access-for-agents.md` | **给 Agent 补上外部平台读取能力（agent-reach）**<br>痛点：命令行 Agent 被困在沙盒内，无法读取 B 站、推特、小红书、GitHub 最新内容。<br>解法：分层降级读取网络与 doctor 体检机制。 | **未发** | **A 级** |
| 08 | `playbooks/self-hosted-agent-automation.md` | **自托管常驻 Agent（nanobot/NanoClaw/CowAgent）两周验收法**<br>痛点：被 README 的全能清单忽悠，上线后人工擦屁股。<br>解法：两周指标量化：按时完成率 / 人工介入率 / token 成本。 | **未发** | **B 级** |
| 09 | `playbooks/compose-agent-tools-with-code.md` | **让 Agent 用代码沙箱跑完多工具批量分析**<br>痛点：多工具链式调用打爆 Context Window。<br>解法：在沙箱内写 Python/Node 脚本编排，中间数据不回灌上下文。 | **未发** | **C 级** |

#### 类别 B：评测、回归验收与质量把关
| 序号 | 文件路径 | 核心主题与痛点切入 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 10 | `playbooks/build-and-run-evals.md` | **让 AI 的改动拿出证据：先建评测爬坡，再用回归闸门验收**<br>痛点：凭感觉改 Prompt，暗中破坏原有功能。<br>解法：严谨回归测试思想（swe-sweep）：基线置信区间，有新失败一票否决。 | **未发** | **S 级** |
| 11 | `playbooks/verify-agent-changes.md` | **让编码 Agent 在宣布完成前拿出证据，包括它亲眼看到的界面**<br>痛点：Agent 习惯性“宣布完成”，代码跑不通或前端溢出。<br>解法：代码测试证据 + 自动化浏览器截图视口校验，强制图文双证。 | **未发** | **A 级** |
| 12 | `playbooks/orchestrate-multiple-agents.md` | **把 AI 的「完成」变成可验证交付：多策略竞争与测试闸门**<br>痛点：单一 Agent 答案陷入局部最优。<br>解法：多 Agent 对抗淘汰（Arena）、测试硬闸门与独立 QA 攻击复核。 | **未发** | **A 级** |
| 13 | `playbooks/performance-optimization-with-agents.md` | **让 Agent 在可测量的窄目标上爬坡：先立基线，锁死基准**<br>痛点：泛性能优化越改越慢。<br>解法：圈定单命令测量目标，只能下降基准防止收益回退。 | **未发** | **B 级** |

#### 类别 C：技能、上下文与多 Agent 协同
| 序号 | 文件路径 | 核心主题与痛点切入 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 14 | `playbooks/build-and-install-agent-skills.md` | **给编码 Agent 装技能：为什么一次只装一个？**<br>痛点：疯狂囤积技能包，导致上下文税与语义污染。<br>解法：单一装载、A/B 对照验证收益、拿不出证据即刻删除。 | **部分已发**（`anthropic-agent-skill-best-practices.mdx` 发了官方规范，但雷达#214最新实操未展开） | **S 级（建议更新或写姊妹篇）** |
| 15 | `playbooks/manage-agent-context.md` | **让同一台机器上的多个编码 Agent 共读一套规则**<br>痛点：Claude Code、Codex 各自为政，重复配置且行为漂移。<br>解法：单一权威源 + 软链对齐 + 一眼可验规则注入验证。 | **未发** | **A 级** |
| 16 | `playbooks/persistent-memory-for-coding-agents.md` | **让 AI 跨会话记住项目背景：带记忆目录的工作文件夹**<br>痛点：每次新会话从零交待背景。<br>解法：Second Brain 机制，独立 memory 目录与持久化规则。 | **未发** | **B 级** |

#### 类别 D：模型路由、成本与算力档位
| 序号 | 文件路径 | 核心主题与痛点切入 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 17 | `playbooks/route-judgments-to-small-models.md` | **别让大模型做“是非题”：把门禁拆给小模型**<br>痛点：全流程顶着旗舰模型做简单的 0/1 判定，又慢又贵且发散翻车。<br>解法：判断归小模型，生成归大模型；小范围构建 100-200 样本对照实验。 | **未发** | **S 级** |
| 18 | `playbooks/model-routing-for-coding-agents.md` | **编码不因配额中断：本地网关按任务选模型与自动回退**<br>痛点：长任务跑到一半被 429 掐死。<br>解法：本地 OpenAI 兼容网关（OmniRoute/cc-switch），按任务动态路由与兜底。 | **未发** | **B 级** |
| 19 | `playbooks/tune-agent-effort.md` | **把 AI 的算力档位当工作方式：低档起稿、高档验边界**<br>痛点：全开满高档太贵太慢，全开低档逻辑不严密。<br>解法：四步循环分档法：采访需求→低档初稿→低档迭代→高档验边界。 | **部分已发**（`claude-code-opus-5-5-config.mdx` 提过配置） | **B 级** |

#### 类别 E：代码审查、前端与文档工程
| 序号 | 文件路径 | 核心主题与痛点切入 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 20 | `playbooks/replicate-web-pages-with-agents.md` | **照着参照物重建页面：量出规格，用像素 diff 闭环**<br>痛点：AI 还原网页凭空脑补间距与字体。<br>解法：Copycat 测量抽取真实 Token，代码构建后以像素差异率收敛验收。 | **未发** | **A 级** |
| 21 | `playbooks/build-ui-components-with-agents.md` | **把检查挪到 Agent 交付之前：图表、组件与前端界面**<br>痛点：AI 交差前不自检，页面全是低级样式 bug。<br>解法：前置静态 lint 检查（impeccable）、可访问性基线拦截。 | **未发** | **A 级** |
| 22 | `playbooks/code-review-with-agents.md` | **让 PR 评审先看到架构图：把 diff 变成可讨论的图**<br>痛点：上千行 diff 没人愿意看，漏看核心改动。<br>解法：PR Lens 自动将 Git diff 抽象为模块数据流图，挂在 PR 顶部。 | **未发** | **B 级** |
| 23 | `playbooks/code-search-for-agents.md` | **陌生代码库定位：先查检索或知识图谱再读文件**<br>痛点：AI 在大项目里盲人摸象、逐文件瞎翻耗尽 token。<br>解法：AST 结构图谱与分层语义索引先行。 | **未发** | **B 级** |
| 24 | `playbooks/keep-generated-docs-consistent.md` | **AI 写的仓库文档不再各说各话：检查器诊断，Agent 照修**<br>痛点：AI 生成的文档过期矛盾，又被读回去当污染上下文。<br>解法：Seiso 文档 linter 产生确定性诊断，驱动 Agent 机械修复。 | **未发** | **B 级** |
| 25 | `playbooks/self-hosted-document-qa.md` | **让 Agent 把自有文档变成带引用的问答与定时产出**<br>痛点：企业文档问答缺乏事实溯源。<br>解法：带精确段落引用的 pipeline。 | **未发** | **C 级** |
| 26 | `playbooks/add-vision-to-text-agents.md` | **让没有视觉的模型先拿到图片证据再回答**<br>痛点：纯文本模型无法直接读图。<br>解法：利用外部轻量 CLI 工具做预解析。 | **未发** | **C 级** |
| 27 | `playbooks/agent-operations-with-permissions.md` | **让 AI 先只读审计广告账户，改账户必须过六道门控**<br>痛点：高危金钱操作如何安全接入 AI。<br>解法：只读优先、只出草案、多道门控签名。 | **未发** | **C 级（垂直领域）** |
| 28 | `playbooks/benchmark-agent-model-serving.md` | **换模型或调配置前，先用真实任务量出一条基线**<br>痛点：本地推理调优缺乏客观对比指标。 | **未发** | **C 级** |

#### 类别 F：已发归档手册（对照 `ai-blog` 已发布博文）
| 序号 | 文件路径 | 对应手册标题 | 博客文章文件名 | 博客标题 |
|---|---|---|---|---|
| 29 | `playbooks/architecture-review-with-agents.md` | 让 agent 做架构清点：只要数字，不要意见 | `architecture-review-numbers-not-opinions.mdx` | **让 Agent 审查代码架构：只要数字，不要意见** |
| 30 | `playbooks/controlled-language-explanations.md` | 让模型用受控语言解释内容，让读者少追问 | `karpathy-ste-test.mdx` | **用 ASD-STE100 规范约束 AI 输出的测试** |
| 31 | `playbooks/learn-while-coding-with-agents.md` | 让 AI 写码时你仍然做决定：用检查点边做边学 | `keep-your-brain-while-using-agents.mdx` | **与 Agent 协作时如何避免思维退化：分段检查点的实践** |
| 32 | `playbooks/delegate-long-coding-tasks.md` | 让编码 agent 先对齐需求，再自主跑完长任务 | `developer-to-manager.mdx` | **从开发者到管理者：Agent 的能力边界与工具供给** |
| 33 | `research/history/.../alibaba-ai-native-handbook-reading-2026-09-23.md` | 阿里《AI Native 研发范式实践手册》研读记录 | `what-makes-a-real-digital-employee.mdx` | **什么才算真正的数字员工？聊聊阿里的权限与环境实践** |
| 34 | `research/radar/.../1604-agent-memory-repo-cognition-git-agent-agent.md` | Cognition Agent Memory Repo 长期记忆规范 | `git-as-agent-long-term-memory.mdx` | **为什么 Git 才是 Agent 长期记忆的最佳载体？** |
| 35 | `research/history/.../engineering-uber-asdlc-2026-09-27.md` | Uber Agentic SDLC 百万行软件工厂实战 | `uber-agentic-sdlc-software-factory.mdx` | **当 70% 的代码由 AI 编写：Uber 软件工厂的防塌陷架构** |
| 36 | `research/history/.../engineering-anthropic-uber-2026-09-27.md` | Anthropic 长程任务 Meta-Harness 架构实录 | `anthropic-long-running-agent-architecture.mdx` | **为什么 Agent 跑半小时就崩溃？聊聊 Anthropic 的解耦架构** |
| 37 | `playbooks/reverse-engineer-software-with-agents.md` | 在没有源码时，让 agent 有证据地搞懂一个功能再重建 | `reverse-engineer-software-with-agents.mdx` | **没有源码时用反编译证据重建功能：REA 的实践** |
| 38 | `playbooks/manage-agent-context.md` | 把编码 agent 的上下文管起来（自动交接与状态落盘） | `coding-agent-context-auto-handoff.mdx` | **编码 Agent 长任务的自动交接与状态落盘：三个开源插件的解法** |

### 3. 已安装与自建 Skills（`skills/` 与 `~/skills/`，共 8 项）

| 序号 | Skill 名称 | 核心定位与机制 | 对应博客状态 | 价值评级 |
|---|---|---|---|---|
| 39 | `skill-management` | **多 Agent 单一权威源管理**：`~/skills` 作为唯一正本，通过软链分发给各个 Agent（Claude Code/Codex/omp），解决多工具配置重复与不一致 | **未发** | **A 级** |
| 40 | `paseo-senior-advisor` | **咨询高级顾问门禁**：在 Agent 试图缩小范围、半途放弃或向用户抛出技术选择题前，强制向高推理模型咨询破局方案 | **未发** | **S 级** |
| 41 | `workflow-learning` | **工作流沉淀机制**：非平凡任务完成后，结构化评估可复用流程或纠偏，达到复现频次时自动提炼为新 Skill | **未发** | **A 级** |
| 42 | `agent-reach` | **全网多平台读取适配**：为命令行 Agent 补齐小红书、B站、推特、网页等外部读取能力，带 doctor 体检降级 | **未发** | **S 级** |
| 43 | `herdr-link` | **多终端 Agent 进程间通信**：基于 pane-id 的点对点消息管道，让多个独立 Agent 互相派活协作 | **未发** | **B 级** |
| 44 | `write-post` | **博客写作工程化流水线**：集成 `check_prose` 与 `check_translationese` 自动化拦截 AI 机器味 | **已发**（`how-to-make-ai-write-a-blog.mdx`） | 已归档 |
| 45 | `ai-tool-radar` | **技术雷达自动扫描器**：按 Try now/Study/Watch/Avoid 四级输出可执行报告 | **已发**（`radar-while-i-sleep.mdx`） | 已归档 |
| 46 | `ego-browser` | **Agent 原生语义浏览器**：带真实登录态与语义快照的浏览器操作环境 | **部分已发**（`agent-is-the-first-user.mdx`） | 已归档 |

---

## 三、渐进式检查（Incremental Inspection）执行规范

从即日起，后续再检查“哪些值得写成博文”时，**禁止再进行盲目翻阅**，严格按以下 3 步增量排查：

1. **查看增量提交**：
   ```bash
   # 查看基线提交（149ce98）之后的所有变更手册
   git diff 149ce98..HEAD --name-only playbooks/ experiences/
   ```
2. **查看新增雷达**：
   ```bash
   # 查看 2026-10-03 之后的雷达新增（按日期目录查看）
   ls -la research/radar/$(date +%Y-%m-%d)/
   ```
3. **匹配与更新**：
   - 若新增内容对应已有条目，检查是否提升了原有条目的评级（例如从 B 升级到 S）；
   - 若新增了独立手册，按本文件表格格式在尾部追加，并标注新增日期；
   - 博客发布文章后，将对应行的状态由“未发”改为“已发”，并填入博客文件名。
