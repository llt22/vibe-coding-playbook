# hao-ai-lab/vstack

- 结论：**值得一试**。值得小范围试用：把 vstack 的“角色隔离 + 规格哈希锁定 + 行锚定模型 + 变异/轨迹关卡 + 证明与运行时镜像”这套反作弊关卡，套到一个有明确安全性属性的并发模块上（例如缓存租约或请求生命周期），因为它的价值在于能把“智能体说验证过了”变成可机械判定的通过/失败；但工具本身很新（32 stars），文档细节缺失，推荐的模型名无法核实，所以先不要全面铺开。
- 原文：https://github.com/hao-ai-lab/vstack
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T08:54:29.027Z

## 是什么

vstack 是 hao-ai-lab 为编码智能体提供的形式化验证工具栈，把 TLA+、Apalache、TLAPS、Z3 组织成一道带“机械关卡”的验证流程。它要解决的核心问题是：普通的智能体会通过弱化不变式、删掉超时分支、添加未经验证的假设来“骗过”形式化检查器，让检查器给出通过结果。vstack 通过安装到 Claude Code、Codex、Cursor 中的技能或插件，让智能体在一个受约束的流程里做建模、证明和红队评审。

## 具体做法

1. 环境准备。前提：本机有 Java，因为 TLC 依赖 Java；有 Z3；有 git、uv；有一个受支持的宿主，即 Claude Code、Codex 或 Cursor 之一。

```bash
git clone https://github.com/hao-ai-lab/vstack.git && cd vstack
uv tool install -e .
vstack setup   # checks Java/TLC/Z3 and installs skills into Claude Code, Codex, or Cursor
```

2. 也可以按插件方式安装。前提：已经装有对应的宿主或 IDE。

```text
# Claude Code
/plugin marketplace add hao-ai-lab/vstack
/plugin install vstack

# Cursor
/add-plugin vstack
```

3. 选定一个目标模块和一条安全性属性，用 `/vstack-mode` 发起验证。前提：属性要写成可否证的安全性陈述，即“永不发生 X”，并且指向具体模块，而不是泛泛要求“帮我验证一下”。

```text
/vstack-mode verify that our RDMA KV cache lease manager never recycles an in-flight page on timeout.
```

4. 按五道关卡组织流程，原文列出的语义如下。即使不安装工具，也可以把这五条当作人工评审清单来执行：
   - **角色隔离**：coordinator、worker、red-team 三类 agent 分开，让规格、建模和评审相互独立。
   - **规格哈希锁定**：对安全性属性和定理签名做 SHA-256 锁定，使 worker 不能悄悄弱化目标。
   - **模型行锚定**：每个状态变量和动作都要映射到确切的 `file:line@commit`，并在 TLC、Apalache、Z3 三处保持一致。
   - **变异与轨迹关卡**：模型必须在历史 bug 上失败、在修复后通过、在移除 guard 后再次失败，并且能重放真实 trace。
   - **证明与运行时检查**：关键状态机要做 TLAPS 无界证明，并把前置条件同步镜像为运行时断言。

5. 分阶段选模型。原文给出的分工原则是：建模、证明和红队用推理能力最强的档位；代码分析与复现 harness 用擅长在大规模 Python/CUDA 代码库中导航的档位。注意原文列出的具体模型名（`Fable 5.2`、`GPT-6.1-Sol`、`Gemini 4 Carbon`、`Claude Opus 5.5`）无法核实，不能照抄；请按上述能力特征替换为自己可用的模型。

6. 记录产出。发现真 bug 后，按 `bugs/verified-bugs.csv` 的结构记录，并用 `Prior Status` 区分为：全新发现（`Unknown`）、部分已知（`Partly Known`）、上游已独立发现但未修复（`Known`）。这样后续统计“形式化到底多抓到了多少”才有基线。

## 对应的研究问题

1. **能力发现**：把原本交给智能体的“写代码加跑测试”扩展到“写形式化规格、做归纳不变式证明、以及扮演 red-team 找缺失的 guard”。这正好是通常不会想到交给 AI 的那类工作。
2. **任务匹配**：原文明确按阶段配模型，建模、证明和红队适合强推理档，代码分析与复现 harness 适合长上下文代码导航档；工具上，TLA+ 和 Apalache 用于状态机与并发协议，Z3 用于约束求解，TLAPS 用于无界证明。协作方式上强调三角色隔离，而不是让同一个 agent 既写规格又自评。
3. **条件供给**：需要提供可执行的 Java/TLC/Z3 环境、可 clone 的仓库、写成哈希锁定形式的规格文件、能定位到 `file:line@commit` 的代码访问、用于重放的真实 trace，以及角色分离带来的权限划分。
4. **主动推进**：关卡本身是机械 gate，即在模型不满足条件时阻断，天然可以挂在 commit/PR 上自动运行。但原文没有描述基于时间、事件或状态的调度机制，这一条只有部分依据。
5. **效果验证**：这是该线索最强的部分。验证不靠“看起来对”，而是靠三条硬判据：注入已知 bug 的模型必须失败、修复后的模型必须通过、移除 guard 后必须失败；此外还有真实 trace 重放和 TLAPS 证明。

## 与已有做法的关系

清单中的 **Claude Code**（adopt）和 **Cursor**（watch）正是 vstack 的安装宿主：它不是替代这两个工具，而是在它们之上加一层验证关卡和技能编排，所以是对已有 adopt 条目的加固，而不是重复。对 Cursor 一侧，原文只给了一句 `/add-plugin vstack`，细节不足，与清单中 Cursor 的 watch 状态相称。清单中没有其他形式化验证类的相关条目。

## 证据与局限

- **原文给出的可核查内容**：可复制的安装与插件命令、`/vstack-mode` 的调用形式、五道关卡各自的语义、按阶段划分的模型分工表；案例方面提到在 SGLang 和 vLLM 中发现了并发、生命周期、数值三类 bug，并公开了 bug 表格；VeriServe 在 226 个 TLAPS 模块上做了证明，在 NVIDIA GB200 上平均 p50 TPOT 开销为 +0.18%。
- **只是作者主张**：关卡“能防住作弊”这一点没有任何量化对比，例如没有说明加关卡前后的作弊率。推荐模型名疑似占位或未来版本，不可采信。
- **材料缺口**：具体实现细节分散在 `docs/layer-0.md`、`docs/contracts.md`、`docs/method-selection.md`、`docs/gates.md`、`docs/trace-validation.md`，本次文本未包含这些内容，所以只能确认流程骨架，无法确认哈希锁定、变异生成、trace 重放的具体做法。
- **成熟度**：仅 32 stars，引用信息标注为 2026 年，属于很新的项目，可运行性需自行验证。
- **适用条件**：只适合有明确状态机和并发协议的系统代码，例如推理服务、缓存与租约管理、调度器；对缺乏形式化规格价值的任务（界面、文案、简单 CRUD）不划算。团队里需要有人能写或至少能审 TLA+ 规格。

## 怎么试、怎么验证

最小试用方式：挑一个你确信存在过或可以注入并发 bug 的模块，例如缓存租约、请求生命周期或超时回收；写下一条“永不发生 X”的安全性属性；按上面第 1–3 步安装并运行 `/vstack-mode`；同时保留一份“不用 vstack、只让 agent 自证”的对照组。

判据指标：

- **变异三关**（核心）：注入 bug 版本必须失败、修复版本必须通过、移除 guard 版本必须失败。三项全部命中，才算关卡真的生效；任一项不命中，说明关卡是形式上的。
- **抗作弊观测**：记录 worker 尝试弱化不变式、删超时分支或加未验证假设的次数，以及被 gate 拦下的次数。
- **轨迹重放**：手头的真实运行 trace 能否作为模型输入并通过验证。
- **发现能力**：新发现的真 bug 数，按 `Unknown`、`Partly Known`、`Known` 分类统计。
- **成本**：单次验证的耗时与 token 消耗、相对人工审查的节省；运行时开销以上游 VeriServe 的 +0.18% p50 作为预期上限参考。
- **改善判据**：变异三关全绿，并且至少抓到一条人工评审漏掉的真实问题，才算“确实改善了结果”；否则退回 study，只借用关卡清单。
