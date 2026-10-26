# Show HN: ADRs for AI – Deliberation records for human–AI work, versioned in Git

- 结论：**值得一试**。以 Git 仓库为载体的“人机协作决策记录”值得在一个项目上小范围试点：把 AI 提出的选项、理由、置信度和证伪条件固化成 ADR，人只做接受或推翻，并用 grep 检索开放问题来保证可续接。理由是原文给出了可直接复制的建仓、种子、提问、裁决流程和记录格式，但目前只有作者自述与单项目案例，尚无效果数据。
- 原文：https://adrs.systems
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T08:54:23.804Z

## 是什么

ADRs4AI（Deliberation records for human–AI work）把软件工程里的架构决策记录（ADR）搬到人机协作场景：每次与 AI 协作产生的“为什么”（选项、推理、置信度、反证条件、人的裁决）以 Markdown 记录写进 Git 仓库并版本化，而不是留在聊天记录里。

交付物由四部分组成（原文列举）：

- 模板仓库：ADR 与 seed 模板、指令（directives）、inbox 协议、task-runner recipes，可整体采用或按特性挑用。
- VS Code 扩展：开放问题树视图、边写边查的格式诊断、深链、以及一个 MCP server，让 agent 可以查询记录。
- iOS 客户端：导入仓库、审阅问题、一键 Accept 把答案落成 commit。
- 方法本身：AI 承担推理（给出选项、建议、理由、置信度、证伪条件），人只花一次判断（接受、推翻或任意形式的回答），记录保留“why”供后来者（人或 agent）复用。

原文明确划出边界：这不是对话存档、不是向量数据库式的“记忆”、不是编排平台，也不主张 AI 有持久身份；它只是让工作“可续接、思考可复利”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已安装并登录 GitHub CLI（`gh auth login`），本机有 git；有一个可运行 agent 的终端（原文用 `claude`）。

1. 从模板创建私有仓库（原文“十分钟从零开始”第 1 步）：

```
# 1 · Your copy of the template 
gh repo create my-project --private --clone \
  --template ADRs4AI/human-ai-collaboration-template-A
cd my-project
```

2. 打开模板里的 `CLAUDE.md`，填写顶部区块（原文：messy is fine，写得乱没关系）；然后在任何实际工作开始前先“立此存照”：

```
# 2 · Open CLAUDE.md, fill in the top block (messy is fine), 
# then stake the record before any work starts: 
git add -A && git commit -m "chore: the record begins before the building does" 
```

3. “招募” agent，把任务以邀约形式给它，并允许它拒绝或提出异议（原文提示词）：

```
# 3 · Recruit — open your agent and offer the mission: 
claude # or your agent of choice 
# "Hello — I have a mission for you. Read about it and tell me 
# if you accept, or any pushback."
```

4. 产出第一个 seed：把自己的思考一次性倒进去，口述、杂乱都可以（capture first）。让 AI 把它切成若干 ADR，保留你的原话、考虑过的选项、推理和开放问题。

5. 回答问题：每条开放问题由 AI 带上选项、建议、理由、置信度、“什么能证明它错”（falsifier），人只需要 accept / override 或给出任意形式的答复。原文的逐字记录结构可直接当模板用：

```markdown
### QST-<ID>: <问题一句话>
- Status: answered
- Why asking: <为什么现在要问，关联到什么下游需求>
- Need: <需要人做什么判断>

**Options**:

- **A — <选项名>**: <一句话>
- **B — <选项名>**: <一句话>
- **C — <选项名>**: <一句话>

**Recommendation**: (by <模型名>)

**<推荐选项>**

**Rationale**: <理由>

**Confidence**: <高/中高……，并说明哪部分不确定>

**Falsifier**: <出现什么情况就必须推翻或扩展这个决定>

**ANS:** (by <人/设备>)
<最终裁决，一行也行>
```

6. 随时把全部开放问题捞出来（原文给的固定检索法，前提是问题标题统一以 `### QST` 开头）：

```
grep -rn '^### QST' docs/adr/
```

7. 按需接入工具：安装 VS Code 扩展（Open Questions 视图、格式诊断、深链、MCP server 供 agent 查询记录；也在 Open VSX 上），或 iOS 客户端登录、导入仓库、一键 Accept 生成 commit。

8. 可选进阶：原文提到“跑一个 crew”——多席位、wake-on-brief、人不再当消息总线——但只说明在 Get started 的第 7–9 步，正文没有给出具体步骤，本报告无法还原，需回原文查。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. 能力发现：可交给 AI 的、原文点明的工作包括：把杂乱的 seed（含口述）切成成组的 ADR、保留原话与选项；为每个开放问题生成选项集、推荐项、理由、置信度与证伪条件；主动“stake”（提出）问题；以及通过 MCP server 被查询记录。原文未提供“以前想不到可以交给 AI”的清单，只是示范了这类元工作可以外包。

2. 任务匹配：把重推理放在前沿模型上（原文实例标注推荐来自 GPT 5.6 Sol，裁决来自 Sonnet 4.5 经手机客户端），把一次判断留给人；不同的入口对应不同粒度的工作——编辑器看全景、手机做一键裁决、MCP 让 agent 直接读取历史决策。原文没有做模型间对比，也没有说哪类问题该用哪个模型。

3. 条件供给：模板仓库 + 填好的 `CLAUDE.md` 顶部区块（项目背景与约定）+ 一份杂乱的 seed 文本（口述可）+ Git 写权限（裁决要落成 commit）+ 可选扩展/客户端/MCP；反馈机制就是 accept 或 override 这一次判断，以及 falsifier 字段为将来推翻预留了条件。

4. 主动推进：开放问题通过 `grep -rn '^### QST' docs/adr/`、编辑器树视图、手机客户端持续浮现，每条都已带好选项与建议，使回答成本降到“接受或推翻”；原文提到 crew 的 wake-on-brief（按简报唤醒）属于这一方向，但没有可照做的步骤。

5. 效果验证：原文没有给出任何量化指标或对照结果，只有“认知负荷下降、带宽释放给更重要的审议”“思考复利”等主张；验证方式需自行设计（见下节）。

## 与已有做法的关系

清单中没有相关条目（清单仅有 arXiv 作为“来源”类条目，状态 try，与本方法的机制无关）。相对常见做法的差异点，原文自述：不是对话存档、不是向量库式“记忆”、不是编排平台；它把协作产物定位为可版本化的决策记录，而不是可检索的聊天历史。

## 证据与局限

原文给出的实证材料：

- 一条逐字记录（QST-HISTORICAL-TRUTH：如何在更正历史记录的同时保留“当时被认为为真”的内容），含三个选项、推荐 C（双时间轴混合）、理由、置信度分级、falsifier，以及一行人类裁决；来源标注为公开项目 frontier-model-observatory 的仓库原文。
- 一张扩展截图，显示“当天第 16 题 / 共 75 题”，可作为记录确实被持续使用的弱证据。
- 两篇论文与模板的 DOI：AAAI 2026 Fall Symposium on Trustworthy Agentic Systems（TAS 2026）接收、Zenodo 10.5281/zenodo.23300579（Deliberative Programming）、模板概念 DOI 10.5281/zenodo.23303469。

属于作者主张、没有数据支撑的部分：思考“每次都被蒸发”、“记录会复利”、“认知负荷下降”、“新手也能用”等；论文被接收不等于方法有效。

局限与适用条件：

- 项目刚发布（Show HN 42 分、21 条评论），方法由单一作者日常实践发展而来，无对照实验、无第三方复现。
- 有明确开销：每个问题都要产出选项、理由、置信度、证伪条件，问题量大时可能变成负担（截图显示单日 75 个问题）。
- 依赖工具链：GitHub CLI、特定 agent 命令、模板仓库名、VS Code/Open VSX 扩展、iOS 客户端；MCP 查询能力需自建或使用其扩展。
- 原文默认私有仓库；团队/合规场景下记录的可访问性与敏感信息处理未讨论。
- crew 自动化（步骤 7–9）在本文中只有名称，无步骤，不能据此实施。

## 怎么试、怎么验证

最小试用（建议 2 周、单个真实项目）：

1. 按上节步骤 1–3 建仓并立首条 commit；`CLAUDE.md` 顶部只填项目目标、当前阶段、已知约束三项。
2. 只跑“seed → ADRs → accept/override”这一环，不启用 crew、不接手机客户端（降低变量）。
3. 每次会话开始时先跑 `grep -rn '^### QST' docs/adr/`，只回答状态为 open 的问题；若 AI 没有主动 stake 问题，要求它按 QST 模板补齐后再继续。
4. 在记录里加一个原文没有、但对验证必要的字段：记录裁决后实际被推翻或返工的情况。

判断是否改善的指标（都可手工统计）：

- 重复讨论率：同一决策在后续会话中被重新讨论的次数（试用期 vs 之前同类项目）。
- 恢复上下文时间：新会话/新接手者从零到能复述“为什么这么定”所需时间与提问次数。
- 问题闭环率与延迟：open → answered 的比例、平均从 stake 到裁决的时间。
- 记录被引用率：后续 ADR 或提交中引用前序 QST 编号的次数（可 grep 统计）。
- 单问题成本：作者回答一个问题平均耗时（若超过几分钟，说明选项/理由质量不足或问题过碎）。

判定“确有改善”的最低标准：重复讨论率下降、恢复上下文时间缩短，且记录确实被后续工作引用（不是写完就没人看）。若只增加了记录量而没有引用与复用，应退回 watch 或改用轻量替代（只在关键决策上写一条 ADR）。
