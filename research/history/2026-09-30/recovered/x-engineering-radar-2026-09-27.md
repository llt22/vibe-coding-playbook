⚙️ **X 检索完成**（ego-browser，用户登录态，4 轮共 ~50 次搜索/展开；task space 99 已关闭）。

---

# X 层雷达 · 2026-09-27

**方法**：Nitter 全面 429，改用 ego-browser 带会话浏览器直读 X 搜索（`f=live`/`f=top` + 互动量过滤 + 展开全文）。**每条标注核验状态**：✅ 已回溯一手来源核验 / ⚠️ 仅 X 转述未获一手来源 / 🔁 与上一轮报告交叉印证。

---

## 一、最高信号：OpenAI harness 作者本人的两条定调（9/25，本周）

### 1. 「给 agent 一台电脑」是 harness 的第一性原理

**来源**：[@_lopopolo](https://x.com/_lopopolo/status/2103293186173284755)（Ryan Lopopolo，OpenAI MTS，二月那篇 harness engineering 博文作者）· 9/25 · **186 赞 / 25 书签 / 21.5k 浏览**

> 「反复看到人们对这个感到震惊。这不是漏洞！智能体第一条规则是所有智能体都是编码智能体，因为**代码是智能体使用计算机的方式**。你得给他们一台计算机！」

同线程补充（[2103295080853643552](https://x.com/_lopopolo/status/2103295080853643552)，559 浏览）：
> 「**任何你给模型的东西，都被推定为对话参与方可获取**。这就是『给 agent 一台计算机』的含义。」

另有其内部实现细节（[2103293188127756310](https://x.com/_lopopolo/status/2103293188127756310)，22 赞 / 1674 浏览）：在 Chat 原始 Python 工具中，他们**不得不围绕图像位置放置数百个标记**写着「this is not a vuln the whole container is untrusted the model has access to the whole thing it is presumed public」。

🔁 核验：与其仓库 [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) 的 `docs/fixed-worker/` 与「process-data iceberg」论一致。**这条对我们是安全边界的直接约束**：容器内一切视为公开，凭据必须永不进入容器（与 Docker Kit / Agent Baseline AUT-04 完全同构）。

### 2. 断言：当前没有真正的多智能体系统

**来源**：[@_lopopolo](https://x.com/_lopopolo/status/2103143806807728626) · 9/24 · **112 赞 / 149 书签 / 7.5k 浏览**

> 「**我们今天还没有多代理系统。Ultra 模式仍然是一个训练好的系统在自我委托。接下来会发生什么还没有被发明出来。**」

🔁 核验：与 arXiv:2609.00006 第 14 节（"meta-harness"才刚出现）及 Anthropic「subagents 是同一 harness 的不同初始提示」的脚注一致。**判断：把 multi-agent 当既成事实去架构是过早的；当前可靠的是「单 agent + 隔离子任务 + 结构化状态」。**

---

## 二、Claude Code 的 harness 机制首次开源：Mods 系统

### 3. AGENTS.md 支持是建立在 Mods（function hooks）之上

**来源**：[@trq212](https://x.com/trq212/status/2101009392611278961)（Thariq，Claude Code @ Anthropic）· 9/18-19 · **31,354 赞 / 5,907 书签 / 4,516 转帖 / 556 万浏览**（本周 harness 类最高）

> 「我们正在为 Claude Code 添加对 AGENTS.md 的支持。从 2.1.277 起，如果文件夹中没有 CLAUDE.md，Claude 将检查并使用 AGENTS.md。」
> 「**AGENTS.md 支持是基于 Claude Code 模组构建的，这是我们即将推出的自定义 Claude Code 框架的方式。** 这是一个内置模组，但你也可以自行构建项目指令的自定义版本。」

生态反应（同线程）：`@rauchg`（Vercel）👏、`@thsottiaux`（OpenAI Codex）「这就是正道，走向光明」、`@bentlegen`「我刚好整理了一个收录热门开源仓库 AGENTS.md 的仓库」、`@maxifirtman`「终于！」。**跨厂商收敛已被 OpenAI 侧公开背书。**

**✅ 已核验源码**：[anthropics/claude-code/mods](https://github.com/anthropics/claude-code/tree/main/mods) 四个内置 Mod —— `sec-default`、`diff`、`telemetry`、`agents-md`。机制定义（原文）：

- **Mod = 一个其行为活在 hooks module 中的 Claude Code 插件**：单个 `register(on, options)`，把引擎事件 hook 成 `($, e, next)` 函数。
- **`sec-default`**：把组织的经典 hooks、prompt 内容、managed settings 与工具策略**置于用户所装插件触及范围之外**；自身不添加任何策略。就座于**最外层**（有 managed settings 的机器 / Team / Enterprise）。
- **组合靠「名词契约（noun contracts）」**：向 `$` 添加名词的 mod 拥有该名词的类型，放在自己的 `types/index.d.ts`，**其他 mod 读取同一文件、绝不复制**；无 provider 时 `$` 构建直接拒绝该 hook 并指出无人提供。
- 测试设施：`claude plugin test mods/diff`，`tier('builtin')`，`mock.clock(on)` 等。

**这是本季度 harness 工程最重要的架构披露**：它给出了「插件如何在不破坏彼此的前提下扩展 agent runtime」的可抄答案 —— **能力边界（sec-default 在最外层）+ 类型化名词契约 + 可测试的 hook 层**。对我们的 Package/Skill 与 Runtime 边界设计有直接参考价值。

### 4. 真实失效：本地指令文件被绑到远程遥测上

**来源**：[@tom_knockk](https://x.com/tom_knockk/status/2102914153467842933) · 9/24 · 41 浏览（低频但信息密度高）

> 「关 telemetry 的人：AGENTS.md 这两天其实没生效——Claude Code 2.1.281 刚补上。
> 1）2.1.277 加了无 CLAUDE.md 时读 AGENTS.md；**实现挂在即将公开的 Mods（function hook）上，用远程 feature flag 当 kill-switch**
> 2）**关 telemetry / DISABLE_NONESSENTIAL_TRAFFIC 时 flag 拉不到 → 文件静默不读，无提示**；HN 一夜 ~439↑ / ~250 评
> 3）工程师 mpoteat 认：rollout artifact，已在 v2.1.281 修
> 4）双文件仍优先 CLAUDE.md，要双读切 `/config` 的 `claude-md-and-agents-md`；Bedrock/Vertex/Foundry 仍未开」

**⚠️ 仅 X 转述**（未回溯 HN 线程与提交，但细节自洽且与 Mods 的 feature-flag 机制吻合）。**教训可直接抄**：**把本地确定性配置（指令文件加载）挂在远程 flag 上是 harness 级缺陷** —— 失败模式是「静默降级、无提示」，正是我们在 ProjectCore Policy/Config 落盘时必须避免的（对应 Agent Baseline 的 fail-closed 原则）。

### 5. `/effort` 与缓存：努力程度第一次成为 cache-aware

**来源**：[@trq212](https://x.com/trq212/status/2103576349499855160) · 9/25 · **5,446 赞 / 8,867 书签 / 113 万浏览**；解读线程 [@stretchcloud](https://x.com/stretchcloud/status/2103623583331226087)

- **Opus 5.5 与 Fable 5.1 是首批「对话中途改变努力程度不破坏 prompt 缓存」的模型**；其他每个模型都把 effort 变更当作**前缀编辑**，使下游全部失效。
- Terminal Bench 3.0 的一个 HTML 净化器任务：低 effort **1/5 通过** → xhigh **5/5 通过**，因为高 effort 花了 **33 分钟对抗性审查自己的草稿并模糊随机输入**，而非 2 分钟快速通过。
- Thariq 自己的循环：**采访我为规格 → 低/中 effort 实现 → 审查 → 高/max effort 验证**。
- 三家的同一旋钮：OpenAI `reasoning_effort`（none→max 六级，定价不随级别变）、Google `thinking_level`（计入输出费用）、Anthropic 率先让缓存感知 effort。

🔁 核验：与上轮 Anthropic《Harnessing Claude's Intelligence》的缓存原则（「会话内不换模型」「静态在前动态在后」）互补 —— **这里给出了「换 effort 等于改前缀」这一具体失效**。

---

## 三、本季度最硬的两篇 harness 论文（X 传播 → 一手核验）

### 6. SoL-Pi：把「省钱」当作 harness 的研究目标（NVIDIA × NTU × MIT）

**X 传播**：[@Montreal_AI](https://x.com/Montreal_AI/status/2101667013462536610)（9/20）、[@alex_verem](https://x.com/alex_verem/status/2102698998515761629)（737 赞 / 1206 书签 / 5 万浏览）、[@omarsar0](https://x.com/omarsar0/status/2103826930181308720)（281 赞）

**✅ 一手核验**：[arXiv:2609.20519](https://arxiv.org/abs/2609.20519) + [the-decoder 报道](https://the-decoder.com/nvidias-sol-pi-system-cuts-coding-agent-token-usage-nearly-in-half-by-optimizing-the-harness/)

**核心**：把 harness 本身当作研究对象，用 auto-research loop 在 **535 个可执行环境**上探索 **152 个方向**、**3000+ 次运行**、**60,000+ agent-environment 交互**，四个机制通过筛选存活：

| 机制 | 做法 | 消除的浪费 |
|---|---|---|
| **Action Fusion** | 合并两个连续步骤（如「改代码 + 跑测试」） | 省掉整整一次模型调用 |
| **Online Context Compact** | 每个规划步骤后压缩累积上下文 | 上下文膨胀 |
| **ObservationPack** | 归档长工具输出，后续步骤只放短摘要 | 每轮重发全文 |
| **Evidence-Preserving Reducer** | 大错误/测试日志路由到更便宜的模型蒸馏出关键发现，**带自动校验防止漏掉线索** | 长日志 |

**实测**（51 任务 EdgeBench，held-out 完全隔离于搜索过程）：token 流量降 **44.7-49.0%**、API 成本降约 **1/3**；效率变体达 Pi 分数的 93.7%，用 token 少 49%；性能优先变体超 Pi 分数 5.3% 仍省 token。**每小时省 $8.75-13.50（相对原生 Codex/Claude Code）、$4.36-5.71（相对 Pi）**。GPT-5.6 Sol 上开发后**零改动**迁到 Opus 5，仍保留 Pi 性能的 94.3%（但机制触发更少更温和——**harness 过拟合到训练模型的证据**）。

**其他基准更混乱（诚实披露）**：Terminal-Bench 4 的 63 个 CPU 任务上 SoL-Pi 只解 15 个，Codex 与 Pi 各解 18 个（成本仍低约 25%）；IMO 2026 的 Lean 4 任务 6 题解出 3 题；kernel 优化中 20 worker 的 SoL-Pi swarm 比 Pi swarm 省 26.8%。

**两个必须知道的副作用**（报道援引他处研究）：**上下文压缩平均只保留 17% 的用户指令**；短上下文会降低 prompt cache 复用率。

### 7. 组件级实证：harness 的每个部件到底值不值

**X 传播**：[@Alex… ] 未直接见，主要经论文检索命中；**✅ 一手核验**：[arXiv:2609.20804](https://arxiv.org/abs/2609.20804)（43 页）

固定执行循环、只变三个组件（planning / action space / context management），4 个模型 × SWE-Bench Verified + Terminal-Bench 2.1，**176 组配对设置**：

1. **上下文预算越紧，上下文管理越有价值**，且**大部分收益来自阻止「上下文溢出失败」**。
2. **先做基于规则的省略（rule-based elision）再做 LLM 摘要**是整体效率最强的策略；而**让被省略内容可恢复（recoverable）反而增加了模型几乎不用的机械结构，且不带来准确率收益**。
3. **Planning 的角色会迁移**：对弱模型是**准确率脚手架**，对强模型变为**成本节省器**（准确率几乎不变）。
4. **预定义工具对 bash 弱的模型有帮助**；**bash 能力强的模型用纯 bash 接口即可，成本显著更低**（尤其在命令行中心任务上）。
5. 轨迹级解释：上下文管理**延长轨迹**但基本不改变行为；planning **改变轨迹在哪里停止**；action space **改变写代码的粒度**。

**这两篇合起来是本轮最有操作价值的结论**：*「先做规则化省略、不要把省略内容做成可恢复」「纯 bash 对强模型更便宜」「planning 在强模型上只省成本不涨准确率」* —— 每一条都能直接推翻一种常见默认做法。

---

## 四、安全侧：Cloudflare 的对抗性验证 harness（可抄的完整范式）

**X 传播**：[@stretchcloud](https://x.com/stretchcloud/status/2103875745718100460)（9/26）、[@0xal0ke](https://x.com/0xal0ke/status/2103888835340124538)（21.9k★ 榜单）

**✅ 一手核验**：[cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)（**22,048★ / 1,276 fork，MIT**）+ [Build your own vulnerability harness](https://blog.cloudflare.com/build-your-own-vulnerability-harness/)

**核心原则（X 上被浓缩成一句话）**：**「验证某个发现的 agent，永远不是发现它的那个 agent。」**

**从 skill（~450 行）到 fleet harness 的六周**，六/七阶段：Recon（3 个并行 agent 写 `architecture.md` + `coverage-ledger.json`）→ Hunt（按攻击类，**从读代码转为主动执行**：编译片段、构造小版本、攻击它们）→ Validate（**确定性代码先做 schema/路径检查，再由隔离 agent 尝试推翻**）→ Structured output（`confirmed` / `needs_validation` / `rejected` 三态 + schema 校验）→ Independent record verification（全新 agent 复核源码主张）→ Target-neutral reporting。

**关键量化与教训**：
- **单次运行只找到重复运行能发现的约一半漏洞**，且偏简单、不 subtle。→「跑十次再人工 diff」就该上 harness 了。
- 验证拒绝率 **40% → 11%**，高完整性发现占比 **35% → 58%**；全生命周期 **20,799 原始候选 → 12,057 存活 → 汇入 VVS 13,841 → 去重折叠 5,442 → 7,245 条可行动**。
- **每个 agent 上下文使用量压在总窗口 25% 以下**（超了就开始幻觉）。
- **Persistence 必须先于 parallelism**：所有阶段写单个 SQLite（键 `run_id, repo, stage`），任何阶段可恢复/重试。
- **Hunter 必须先声明威胁模型才允许提交**，输出 schema 的顺序强制执行这一点——这消灭了「如果用户有数据库写权限，他就能写数据库」这类空洞发现。
- **每条确认发现必须附一个跑在未修改原始代码上的 PoC 测试 + 一个建议补丁 + 功能 git diff**；**Validator 不能提交自己的发现**。
- **⚠️ 反直觉数据**：他们把 Semgrep 全链路接进去，**Hunter 在一个月运行中调用它 0 次**——模型宁愿自己读代码并运行。「值得注意 agent 实际伸手拿什么，而不是你以为它想要什么。」
- **跨模型交叉验证**：VDH 与 VVS 用**不同模型**，让 Model B 无偏、对抗性地压力测试 Model A 的假设；同时把模型供应商当可互换商品，吸收下游波动。
- Wishlist 机制（agent 请求它没有的工具/环境，人类补上后自动重跑原任务）：**跨 128 个 repo 被写入 25,472 次**，是 agent 回话的主要通道。

**这一条与仓库边界的关系**：它的「三态门禁 + 确定性检查先行 + 独立验证」是**用户侧外层 harness** 的完整实现，正好印证上一轮的判断——**Certificate/Verdict/门禁属于外层，不进 Core**；而它「凭据与沙箱」「状态持久化」的部分是 Core 的 Run/Attempt/Artifact/Event 语义。

---

## 五、运行时与权限：平台层正在收敛（X 上一手爆料 + 官方核验）

### 8. DigitalOcean Managed Agents（Firecracker + 凭据代理 + Action Gateway）

**X 传播**（多账号，9/22-25）：[@stretchcloud](https://x.com/stretchcloud/status/2103008782196363452)（4 转帖 / 548 浏览）、[@wallstengine](https://x.com/wallstengine/status/2102417000660365478)、[@ITheEqualizer](https://x.com/ITheEqualizer/status/2103131487092580366)、[@50fiftyGrowth](https://x.com/50fiftyGrowth/status/2102768237909823514)、[@verbal72](https://x.com/verbal72/status/2102766954809344091)

要点（多源一致）：**每会话一个独立 Firecracker microVM**，**暂停时保留文件/进程/上下文**；**暂停→恢复约 305ms**；**按实际使用 CPU 秒计费**（2 vCPU 平均 25% 利用率跑一小时 ≈ $0.06，按整机分配则 $0.126；暂停后 CPU+内存不再计费）；**Action Gateway 一个托管 MCP 端点接 16,000+ 工具，凭据在模型与沙箱之外代理**；敏感操作可设人工批准；可原样跑 Claude Code / Codex CLI / OpenCode / Hermes / 自己的 LangGraph 或 OCI 镜像；工具发现宣称 99.3% 准确匹配意图。

**@stretchcloud 的结构判断**（值得单独记）：
> 「2025 年大部分时间，agent 技术栈是三笔独立采购：执行沙箱、工具网关/MCP 经纪人、推理提供商……**现在被争夺最激烈的不是计算，而是位于 agent 与其工具之间那个受治理端点**——它决定 agent 允许接触什么，并在它思考时对其进行计量。」

🔁 与 Docker Cloud Sandboxes（9/24）、Vercel Sandbox 承载 Cursor Cloud Agents（Firecracker + **短时有效、用户范围凭据**）形成同一模式：**microVM + 凭据永不入沙箱 + 治理网关**。这是 §上轮「权限即代码」在托管层的同时落地。

### 9. 「两个以上子 agent 几乎总是烧 token 且零质量提升」

**X/the-decoder 引用**：Codex 开发者 Eric Provencher 警告 —— 超过两个 sub-agent 几乎总是烧 token 而无质量提升，因为它们大部分时间在互相检查工作。同处还引用 Composio 八月测试：**同一模型（DeepSeek V4 Flash）跨四个 agent 框架，每完成任务成本相差近 3×**。

⚠️ 未回溯原始推文（搜索 `subagent swarm tokens waste provencher` 返回空），但数字在 the-decoder 正文中明确出现。**与 arXiv:2609.20804 的「planning 对强模型只省成本」互为交叉印证：并行/分解不是免费午餐。**

---

## 六、生态：哪些 artifact 真在被使用（含中国团队）

### 10. 阿里 `open-code-review` 开源：确定性 pipeline × agent 混合审查

**X 传播**：[@shao__meng](https://x.com/shao__meng/status/2103102294871142741)（274 赞 / 389 书签 / 2.1 万浏览）、[@0xal0ke](https://x.com/0xal0ke/status/2103586221939442123)、[@DivyanshT91162](https://x.com/DivyanshT91162/status/2103813858829988203)

**✅ 一手核验**：[alibaba/open-code-review](https://github.com/alibaba/open-code-review)（**41,648★ / 2,994 fork / Go / Apache-2.0**）

- **起源**：阿里内部官方 AI 代码审查助手，两年服务数万开发者、识别数百万缺陷后开源。
- **要解决的通用 agent 三痛点**：覆盖不全（大 changeset 上「偷工减料」）、位置漂移（行号/文件引用漂移）、质量不稳（自然语言驱动的 Skill 难调试）。
- **确定性侧硬约束**：精确文件选择、**智能文件捆绑**（如 `message_en.properties` 与 `message_zh.properties` 捆成同一审查单元，每单元一个上下文隔离的 sub-agent，**默认 8 个文件 worker 并发**）、**约 54 个按语言/文件类型的规则文档**（Java/Go/TS/JS/Python/Rust/SQL-XML-mapper/properties 等，用模板引擎而非自然语言匹配）、**外部 re-location 与 reflection 模块分别系统性校正「落点」与「内容」**。
- **基准**：**AACR-Bench**（50 个流行开源库 / 200 个真实 PR / 10 种语言 / 80+ 资深工程师交叉验证 / **1,505 条标注 ground-truth issue**，已发布到 HuggingFace）。**同模型对比 Claude Code：Precision 与 F1 显著更高，token 消耗仅为约 1/9，更快；但 Recall 更低——这是刻意的取舍（偏向精度而非噪声）。**

🔁 与上轮的 `alibaba/open-code-review` 是同一项目（当时仅从 X 线索捕获名称），此处补全了机制与基准。**这是「确定性编排 + agent 认知」在审查场景最完整的开源实现**，其「文件捆绑 + 上下文隔离 sub-agent + 外部定位校正」三件套可直接借鉴。

### 11. 其他被反复提及的 artifact（X 热度榜交叉）

| 项目 | 定位 | 状态 |
|---|---|---|
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | agent 化安全审计（六阶段对抗验证） | ✅ 22.0k★ |
| [alibaba/open-code-review](https://github.com/alibaba/open-code-review) | 混合架构代码审查 | ✅ 41.6k★ |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 生产级工程技能集 | ✅ 99k★ |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | spec-driven（agent 不再自造需求） | ✅ 70k★ |
| `HKUDS/CLI-Anything` | 让任何工具通过 CLI 变 agent-native | ⚠️ 仅 X 榜单（50.6k★ 声称） |
| `stablyai/orca` | 在独立 worktree 中并排跑编码 agent | ⚠️ 仅 X 榜单 |
| `vectorize-io/hindsight` | 跨会话学习的 agent 记忆 | ⚠️ 仅 X 榜单 |
| `obra/superpowers` | 规划→实施→测试→验证 技能与工作流集 | ⚠️ 仅 X 榜单（O'Reilly 文中亦提及） |
| `Tencent/WeKnora` | 文档→RAG/agent/wiki 开源框架 | ⚠️ 仅 X 榜单 |
| `PenguinHarness`（LlamaFactory 团队） | 开源工作空间：agent 行为存于可版本控制的文件，一个 agent 可评估另一个并改其状态、用同一基准验证修改 | ⚠️ X 转述（[@code_hiyouga](https://x.com/code_hiyouga/status/2102005328691024274)）；GitHub 路径 404，未核实 |

### 12. 概念层面：一个正在发生的「品牌重命名」

多位 X 用户（[@_adishj](https://x.com/_adishj/status/2103931129359392946)、[@RitwikSrivast11](https://x.com/RitwikSrivast11/status/2104006644657185044)、[@rafaquint](https://x.com/rafaquint/status/2103966627784220921)「**harness engineering 是软件工程师的新工作**」，1,265 浏览 / 10 赞）指出：旧金山当前的热词是 **"domain-specific harness"**，本质是**软件工程的改名**。[@can](https://x.com/can/status/2103868694137070015)（54 赞 / 52 书签）：「领域特定的测试套件已经成了一个梗，但该死，当人们做得对的时候，它真是令人惊叹。」

[@joelquen](https://x.com/joelquen/status/2103502745755934952) 在 **RailsWorld** 演讲「将 harness 工程原则应用于提升生成 Rails 代码的质量下限」（106 赞 / 109 书签）——**说明该实践已从 agent 工具圈扩散到传统框架社区的质量基线工作。**

---

## 七、反证与陷阱（X 上被明确点名的失败）

| 反证 | 来源 | 对我们的含义 |
|---|---|---|
| **上下文压缩平均只保留 17% 的用户指令** | the-decoder 援引研究 | 压缩不是免费的；关键约束必须落在**文件**而非上下文里 |
| **>2 个子 agent 几乎总是烧 token 零质量提升** | Codex 开发者 Eric Provencher（经 the-decoder） | 反对「多 agent 越多越好」；与 arXiv:2609.20804 交叉印证 |
| **自动优化的 harness 会过拟合训练任务** | SoL-Pi 论文自陈（故严格隔离 EdgeBench） | 我们若做 harness 自进化，**评估集必须完全隔离于搜索过程** |
| **Semgrep 被接进全链路但一个月调用 0 次** | Cloudflare 自述 | 别预先接你认为 agent 会用的工具；**观察它实际伸手拿什么** |
| **「harness 最难的部分是不让它变成一堆无法测试的例外」** | [@jurlycat](https://x.com/jurlycat/status/2100593627340890509) 评论 Google PDF 帖 | 与我们上轮引用的 ThoughtWorks「agent instruction bloat」同源 |
| **「AGENTS.md 里每一行都是一道疤」** | [@theparuchh](https://x.com/theparuchh/status/2100569399438532960) 评论 | 与 Osmani「规则要能追溯到一次具体失败」一致 |
| **本地指令文件被远程 telemetry 静默控制** | §4 上述 | fail-closed 是硬要求 |
| **同一模型跨框架每任务成本差近 3×** | Composio 八月测试（the-decoder 引用） | 成本由 harness 决定，不由模型决定 |

---

## 八、需要标注为未核验的一条（重要）

**「Google 团队 9 页 harness engineering PDF」是本轮 X 传播最广的单一 artifact**（[@AnnatarXBT](https://x.com/AnnatarXBT/status/2100555666427400627) 255 赞 / 370 书签 / 2.3 万浏览，另有 9/8 版本 690 赞 / 1246 书签 / 7.9 万浏览，同账号在中文语境再传播 12 小时前 [@techNmak](https://x.com/techNmak/status/2103862806726750276) 279 赞 / 321 书签）。

其内容（六步：**加指南 → 加传感器 → 建 agent 循环（plan/execute/verify/fix，有界重试/预算上限/卡住升级）→ 外部化记忆 → 强制权限 → 接可观测性（trip wires）**）与上轮我直接核验的 Martin Fowler/Böckeler 框架（guides + sensors）高度同构，**价值上是真的、来源上是可疑的**。

**⚠️ 我未能找到任何 Google 官方一手来源**：搜索 `"harness engineering" guide "add guides" "add sensors"` 只命中 LinkedIn 转帖与付费 newsletter 的二手复述（"A new 9-page paper on harness engineering contains the clearest 6-step playbook"）。**结论：引用其六步内容时，应回溯 Fowler/Böckeler 或 OpenAI 原文，不要引用「Google PDF」。**

---

## 九、X 层相对上一轮报告的**增量结论**（三条）

1. **Claude Code Mods 是 harness 扩展性的第一个可读参考实现**：能力边界 mod 置于最外层（`sec-default`）+ 类型化名词契约（`types/index.d.ts`，跨 mod 只读不复制）+ 可测试 hook 层。**这直接回答了上轮遗留问题「Agent/Skill 如何插拔式组合」**——答案不在 prompt 层，而在**有类型契约的 hook 层**。
2. **成本优化已从「换模型」正式转为「改 harness」的实证学科**：SoL-Pi（-49% token）、组件级消融（规则化省略 > LLM 摘要；纯 bash 更强的模型更便宜）、Cursor 官方 prompt（按任务而非按请求计量、按计费类型加权 token）、OpenRouter 数据（agent token 用量是人类的 5×、二月以来增长 14×、>85% 来自缓存提示）。**「工作负载不是推理，是 agent 拖在身后的上下文。」**
3. **验证的独立性已经工程化到「换模型 + 结构性禁止自我确认」**：Cloudflare 的 VDH/VVS 用**不同模型**交叉判定，Validator **不能提交自己的发现**，Hunter **必须先声明威胁模型**且**必须附跑在未修改代码上的 PoC**。这与上轮 Anthropic 的 fresh-context evaluator、Adversarial Review 的 DISAGREE_EVIDENCE 是同一原则的三个独立实现——**「验证者与作者必须在职责/证据/模型上独立」已从建议变为工程约束。**

---

**信源清单（X）**：[@_lopopolo](https://x.com/_lopopolo) · [@trq212](https://x.com/trq212) · [@Vtrivedy10](https://x.com/Vtrivedy10) · [@ericzakariasson](https://x.com/ericzakariasson) · [@simonw](https://x.com/simonw) · [@stretchcloud](https://x.com/stretchcloud) · [@omarsar0](https://x.com/omarsar0) · [@Montreal_AI](https://x.com/Montreal_AI) · [@alex_verem](https://x.com/alex_verem) · [@shao__meng](https://x.com/shao__meng) · [@code_hiyouga](https://x.com/code_hiyouga) · [@AnnatarXBT](https://x.com/AnnatarXBT) · [@techNmak](https://x.com/techNmak) · [@joelquen](https://x.com/joelquen) · [@0xal0ke](https://x.com/0xal0ke)
**一手核验补充**：[anthropics/claude-code/mods](https://github.com/anthropics/claude-code/tree/main/mods) · [arXiv:2609.20519](https://arxiv.org/abs/2609.20519) · [arXiv:2609.20804](https://arxiv.org/abs/2609.20804) · [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) · [Cloudflare vulnerability harness](https://blog.cloudflare.com/build-your-own-vulnerability-harness/) · [alibaba/open-code-review](https://github.com/alibaba/open-code-review) · [O'Reilly: Agent Harness Engineering](https://www.oreilly.com/radar/agent-harness-engineering/) · [the-decoder: SoL-Pi](https://the-decoder.com/nvidias-sol-pi-system-cuts-coding-agent-token-usage-nearly-in-half-by-optimizing-the-harness/)