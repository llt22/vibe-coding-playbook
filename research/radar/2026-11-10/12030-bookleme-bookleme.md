# bookleme/bookleme

- 结论：**值得一试**。建议小范围试：用一本你有权使用的书跑通 `run` → `validate` → 冒烟评测，重点验证 7 个忠实度指标与负例拒答，再决定是否纳入工作流。理由是仓库给出了可直接执行的命令、产物契约和评测口径，但项目处于 M0–M3，coverage_score 0.667 未达标、LLM judge 未接入、两个插件仍在 M4，尚不足以直接作为稳定生产依赖。
- 原文：https://github.com/bookleme/bookleme
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T21:00:20.768Z

## 是什么

BookLeme（读了么）是一个把书/文档编译成「可安装 Agent Skill」的 Python 工具链（MIT，核心零第三方依赖，Python ≥ 3.9，输入格式支持 PDF / EPUB / DOCX / MD / HTML / RTF / MOBI）。它明确拒绝做「读书笔记」，而是产出两类可安装、可调用、可验证的产物：

- **`knowledge_pack`（知识包）**：结构化知识库，装的是 Topic Index 路由表 + 按需加载的框架分片 + 决策速查 + 出处清单。典型用法是「这本书里 X 框架怎么用？」，且「书里没讲」必须拒答。仓库自带样例 `examples/reference/`（11 文件）。
- **`behavior_skill`（行为 Skill）**：可运行的流程与状态机，装的是角色 + 硬约束 + 状态机 + 具名输出契约 + 反模式 + 情绪护栏。典型用法是「陪我做一次完整的人生设计对话」，可中断续聊。样例 `examples/coach/`（14 文件）。

编译走 S0–S9 流水线：S0 输入登记 → S1 确定性提取 → S2 中文分段 →（S3 体裁路由 ∥ S4 原子能力抽取）→ S5 忠实度校验 → S6 双引擎渲染 → S7 四重校验 → S8 幂等安装 → S9 冒烟评测。两引擎共享 S1/S2/S4/S5 中间表示，只有 S6 分流，所以「一本书不会被读两遍」。

对调研项目最有价值的不是这个工具本身，而是它把「让 AI 忠实使用一本书」这件事拆成了可执行的工程约束：12 特征体裁路由、插件必填字段、7 个忠实度指标、6 条版权硬门、stage 级幂等。

## 具体做法

**前提**：Python ≥ 3.9、git；只处理你有权使用的材料，并在启动时声明 `--user-rights`（`owned|licensed|public_domain|unknown`）。

1. **拉取并确认可运行**（零第三方依赖，Python ≥ 3.9 即可）：

```bash
git clone https://github.com/bookleme/bookleme.git
cd bookleme
python3 -m bookleme --version
```

2. **用仓库自带样例做一次端到端编译**（书 → Skill）：

```bash
python3 -m bookleme run --input evals/cases/synthetic/coach_book.md --title "我的第一本书"
```

3. **校验产物**（官方校验器 + 自有 lint + 版权硬门三重）：

```bash
python3 -m bookleme validate examples/coach
```

4. **跑回归测试**，确认环境与抽取器行为一致：

```bash
python3 -m unittest discover -s tests -v
```

5. **按需指定引擎、体裁与使用权**（默认 `auto` 按 12 个确定性体裁特征自动路由）：

```bash
--engine auto|knowledge_pack|behavior_skill|both   # 引擎选择
--genre <plugin_id>                                # 强制指定体裁
--no-router                                        # 关闭路由，双引擎全出
--install                                          # 写入技能真源（默认关闭）
--user-rights owned|licensed|public_domain|unknown # 使用权声明
```

6. **公开分发必须显式裸词确认**（产物默认私有；第三方书籍生成的 Skill 不得分发）：

```bash
--public --confirm-public PUBLISH
```

7. **新增体裁 = 写一个插件文件**，零改核心：

```
bookleme/plugins/user/<genre_id>.py
```

插件必须声明以下字段，缺一即拒绝加载：`state_machine`、`output_contract`、`hard_constraints`、`anti_patterns`、`voice_calibration`（语气 / 称谓 / 禁用语 / **结论归属**）、`copyright_profile`、`trigger_words`（3–5 个中文触发词）、`eval_prompts`（必须含至少 1 个负例）。内置可参考的已实现插件：`coach_dialogue`（教练/自我对话）、`knowledge_reference`（框架速查）；`professional_analysis`、`decision_checklist` 尚在 M4。

8. **提交或扩展前跑规范校验**（作者写进 CONTRIBUTING 的红线检查）：

```bash
python3 -m unittest discover -s tests -v
python3 -m bookleme schema --state
python3 -m bookleme plugin validate bookleme/plugins/builtin/coach_dialogue.py
```

9. **落地前先读四份规范**：`docs/ARCHITECTURE.md`（流水线与幂等模型）、`docs/PLUGIN_SPEC.md`（16 个必填字段与安全扫描）、`docs/FIDELITY.md`（7 指标与未验证假设表）、`docs/EVALS.md`（评测集设计与 22 条硬验收清单）。README 只是入口，真正的可照做细节在这些文档里。

10. **把 6 条版权硬门当作自己产物的验收清单**（任一失败即不安装、不发布）：单条引文 ≤150 字且逐字可追溯；总引文比 ≤0.03；连续复制 ≤150 字；13 字 shingle 重叠 ≤0.10；产物不含全文/切片；`contains_original_text = false`。

## 对应的研究问题

- **能力发现（Q1）**：给出了一个「没想到交给 AI」的具体职责——不是让模型总结书，而是把书里的**工作方式**（提问顺序、判断条件 + 证据规则 + 证伪条件）编译成可调用的 Skill。这是「知识 → 可执行流程」的转换，而非文本压缩。
- **任务匹配（Q2）**：做了明确的任务—形态分流。按 12 个确定性体裁特征自动判定，也可人工 `--genre` 强制；教练/对话类走 `behavior_skill`（状态机 + 结论归用户 + 情绪护栏 + 可中断续聊），框架速查类走 `knowledge_pack`（Topic Index 路由 + 按需加载 + 拒答）。并声明「确定性提取与概率性生成解耦」，S0–S2 与 S6–S9 全为确定性 Python，不确定性集中在 S3 体裁路由与 S4 抽取（LLM 抽取器目前只是接口占位）。
- **条件供给（Q3）**：这是该材料最实在的部分。需要供给的是：有权使用的输入文件与 `--user-rights` 声明、体裁插件（状态机/输出契约/硬约束/反模式/语气与结论归属/版权 profile/触发词/含负例的 eval prompts）、以及「书里没讲就拒答」的负例。反馈渠道是 `validate` 三重校验与 7 指标回验。
- **主动推进（Q4）**：依据较弱。可提取的只有两点状态驱动的持续性：stage 级幂等（sha256 断点续跑，删任一阶段产物只补该阶段）与 `behavior_skill` 的可中断续聊状态机。材料未涉及时间触发、事件触发的自动推进。
- **效果验证（Q5）**：给了可量化的验证方案，且区分 `measured` 与 `heuristic`。7 个指标：`citation_resolution_rate`、`verbatim_violation_rate`、`negative_refusal_rate`、`trigger_hit_rate`、`artifact_compliance_rate`、`shingle_overlap_max`、`coverage_score`，另有 `groundedness` 为 heuristic、当前为 `null`。外加 6 条版权硬门与 22 条硬验收清单、S9 冒烟评测。

## 与已有做法的关系

清单中没有相关条目。README 中提到的同类项目（`virgiliojr94/book-to-skill`、`bookforge-ai/bookforge-skills`）不属于本项目清单条目，仅作背景对比：前者是「书 → 知识包 + 一份巨型 SKILL.md 操作规程，靠宿主 Agent 执行、无自动回验」，本仓库是「代码化 stage DAG，可单测 / 可 diff」并加逐字引文校验与负例拒答；后者是已蒸馏 skills 的产物库。作者声明未导入这两者任何代码或模板。

## 证据与局限

**原文给出的数据**（本批评测，非第三方复现）：`citation_resolution_rate` 1.00、`verbatim_violation_rate` 0.00、`negative_refusal_rate` 1.00、`trigger_hit_rate` 1.00（目标 ≥0.90）、`artifact_compliance_rate` 1.00、`shingle_overlap_max` 0.084（目标 ≤0.10）、`coverage_score` **0.667（目标 ≥0.85，未达标，作者如实保留）**、`groundedness` 为 `null`（LLM judge 未接入）。仓库有 CI badge、37 stars、MIT。

**作者自陈的边界**（应视为已知局限而非缺陷披露）：S4 当前为确定性抽取器，LLM 抽取器只是接口占位；LLM judge 未接入，`groundedness` / V2 / V3 为 `null`；`coverage_score` 未达标；`professional_analysis`、`decision_checklist` 两个插件尚在 M4；`evals/baseline.json` 实测数要到 M5 才出。三条设计原理（编译期/运行期分离、渐进式披露三级、确定性提取与概率性生成解耦）被作者自己标为 `UNVERIFIED`，「提炼结构而非摘要」也只是设计选择而非已验证结论。

**只是主张、没有数据支撑的部分**：「一本书不会被读两遍」的共享 IR 收益、插件零改核心的可扩展性、双引擎自动路由的准确率——README 未给出对应数字。

**适用条件**：单机 Python 环境；输入需为可解析的文本型书籍文件（扫描件、封面不可提交）；只处理自有/授权/公版材料；第三方书籍产物默认私有、不可分发；MIT 只覆盖转换器代码，不覆盖任何书籍。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：

1. 选一本你熟悉、且有权使用的书（10 万字内），转成 md/epub/pdf。
2. 跑 `run --input <你的书> --title "..." --user-rights owned`，观察是否自动路由到合理体裁；不满意再用 `--genre` 强制。
3. 跑 `validate <产物目录>`，记录 7 个指标的实测值，尤其看 `coverage_score` 与 `shingle_overlap_max`。
4. 人工做三组对抗测试：
   - **负例拒答**：问书里明确没讲的框架，必须拒答，不能编。
   - **逐字溯源**：随机抽 5 条引文，回原文核对是否是精确子串。
   - **触发词**：用插件声明的 3–5 个中文触发词各触发一次，看是否命中预期 Skill。
5. 把产物装进你日常用的 Agent，用 3 个真实工作任务跑一遍，记录「不用 Skill」与「用 Skill」的差异。

**判断有没有改善的指标**：

- 硬指标（有则必看）：`negative_refusal_rate` = 1.00、`verbatim_violation_rate` = 0.00、`citation_resolution_rate` = 1.00，任一不达标即说明忠实链路有洞。
- 及格线指标：`trigger_hit_rate` ≥ 0.90、`shingle_overlap_max` ≤ 0.10、`artifact_compliance_rate` = 1.00。
- 需自行观察：`coverage_score` 作者自测仅 0.667，试用时若低于 0.85，说明该书的关键框架没被抽全，应降低对该产物的信任或换体裁插件重跑。
- 业务指标：同一批真实任务上，「有 Skill」相比「直接把书丢给长上下文模型」，是否减少了事实性返工、是否减少了人工查证次数。这一项 README 没有数据，只能自测。
- 不建议现在依赖的：`groundedness` 等 judge 类指标（未接入，恒为 null）。
