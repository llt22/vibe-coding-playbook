# heqiangdiao-wq/AI-Cross-Border-Ecommerce-Agent-Toolkit

- 结论：**值得一试**。建议小范围试：选一个 Shopee/Mercado Livre 产品或已有 Listing，按 README 的“模板→Prompt→LLM→自检→上架→06/07 回流复测”跑一条闭环，验证能否稳定产出合规素材；理由是它给出了可复制的步骤和文件结构，但当前只有 README 可见、仓库为 v0.3 beta，效果未经验证。
- 原文：https://github.com/heqiangdiao-wq/AI-Cross-Border-Ecommerce-Agent-Toolkit
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T09:07:53.595Z

## 是什么

`AI-Cross-Border-Ecommerce-Agent-Toolkit` 是一个把跨境电商运营 SOP 翻译成可复用 AI Agent 工作流的开源工具箱（MIT，v0.3 beta）。它不是软件或 SaaS，交付物是：运营方法论、AI Prompt、工作流程、模板与案例。仓库称 7 个 Agent 模块全部完成，方法论拆自一份 38 页内部运营 SOP 手册；原始手册含刷单、诱导评价、虚假举报、参数虚标等平台禁止做法，仓库把已识别项改写为合规替代方案，未实现项登记在 `docs/05_SOP_Gap_Register.md`。

7 个 Agent：

- 01 市场分析：前置判断 / 容量 / 集中度 / 价格带（波谷检测）/ 配置组合，带计算脚本
- 02 产品策略：定位 / 配置 / 主推卖点收敛 / 定价模型 / SKU 四角色
- 03 Listing 创意：关键词分类 → 标题 → 详情页 → 卖点/参数
- 04 产品图：9 图规划 → 出图 Prompt → 合规自检
- 05 短视频：脚本 → 分镜 → AI 视频 Prompt → 配音字幕
- 06 广告优化：四类漏斗诊断 + 盈亏线核算 + 预算/ROI 模型
- 07 评论分析：八类归因 + 误解型识别 → 详情页修补建议

平台一等支持 Shopee、Mercado Livre；Amazon、TikTok Shop、Shopify 字段已适配。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：README 称不需要 API key、不需要装环境；但 01 的市场指标要由 `scripts/` 计算，脚本具体命令 README 未展开，需到仓库对应目录查看。以下步骤按 README 的快速开始和闭环流程图整理。

1. 选平台和产品。Shopee、Mercado Livre 为一等支持；Amazon、TikTok Shop、Shopify 只有字段适配。确认平台硬指标，发布前以平台后台实时规则为准。参考 `docs/02_Platform_Output_Spec.md`。

2. 复制输入模板。进入对应模块的 `templates/` 目录，复制输入模板：

```text
01 市场分析：input_category_research
02 产品策略：input_strategy_brief
03 Listing：input_product_brief
04 图片：input_image_brief
05 视频：input_video_brief
06 广告：input_ad_data
07 评论：input_review_batch
```

3. 填写产品信息（README 称约 10 分钟）。前提：01 需要类目导出数据；06 需要广告数据；07 需要评论数据；03/04/05 需要 02 产出的主卖点和产品要求。输入契约化：缺字段就不应让模型编参数。

4. 把「系统 Prompt」+「任务 Prompt」+「填好的模板」交给任意 LLM。Prompt 在 `Agents/<模块>/prompts/`。各模块任务 Prompt 文件名：

```text
01：00_system · 01_category_precheck · 02_market_analysis
02：00_system · 01_product_decision · 02_pricing_and_sku
03：00_system · 01_keyword_to_title · 02_description_builder · 03_compliance_guard
04：00_system · 01_image_plan_9grid · 02_image_prompt_generator
05：00_system · 01_script_and_storyboard · 02_ai_video_and_voice
06：00_system · 01_funnel_diagnosis · 02_budget_roi_model
07：00_system · 01_classify_and_attribute · 02_misunderstanding_detector
```

5. 用 `docs/04_Result_Checklist.md` 逐条自检，通过即发布。每个模块交付时给一份自检清单，逐条打勾才算完成。

6. 按推荐顺序跑完整链路。README 以 Patinete Elétrico 为例给出：

```text
类目导出数据 → 01 市场分析（+脚本算指标） → 02 产品策略（定价+SKU）
→ 03 Listing Creative（标题/卖点/参数）
→ 04 Product Image（主图/详情图） 和 05 Product Video（脚本/分镜/配音）
→ 上架
→ 06 广告漏斗诊断、07 评论八类归因
→ 回流修改 03/04 → 复测 → 达标放量 / 未达标回诊断
```

三个关键点：01 带脚本，指标由 `scripts/` 计算，Agent 只负责解读；02 决定卖点，03/04/05 才能开工，主卖点必须收敛成唯一一句；06 和 07 会把结论回流到 03/04，这一步是闭环和一次性生成工具的分界线。参考 `Examples/03_Closed_Loop/`。

7. 平台硬指标复核。README 给出的表：

```text
Shopee：标题上限 120 字符（前 30 字符权重最高）；白底，最多 9 图；输出 PT-BR / EN / 本地语
Mercado Livre：标题上限 60 字符；纯白底 RGB(255,255,255)，≥800×800，最多 12 图；输出 PT-BR / ES
Amazon：标题 200 字符（建议 80）；纯白底，≥1000×1000；输出 EN
TikTok Shop：标题按站点；竖版 9:16 优先；输出本地语
Shopify：标题建议 70；无硬限制；输出 EN / 本地语
```

所有硬指标以平台后台实时规则为准，发布前请复核。

8. 合规前置。涉及参数虚标、品牌词、夸大宣传，Prompt 里做硬拦截，不是建议。合规改写见 `docs/03_Compliance_Guard.md`；未实现项见 `docs/05_SOP_Gap_Register.md`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. 能力发现：原文把多个跨境运营环节列为可交给 AI Agent 的工作：市场前置判断、容量/集中度/价格带波谷检测、配置组合、产品定位与定价、主推卖点收敛、SKU 四角色、关键词分类到标题/详情页、9 图规划与出图 Prompt、短视频脚本/分镜/配音字幕、广告四类漏斗诊断与盈亏线核算、评论八类归因与误解型识别。可迁移的能力发现点是：凡是「老手有判断规则、新人产出不稳定」的 SOP 环节，都可以尝试拆成「Prompt + 输入模板 + 案例 + 自检」。

2. 任务匹配：适合有明确 SOP、输入可模板化、输出有清单可自检的任务。模型和工具上，用任意 LLM 即可跑 Prompt；指标计算交给脚本，Agent 只解读；分析簇 01-02 在前，创意簇 03/04/05 在中，运营簇 06/07 在后并回流。平台特定输出要按字段/字数硬指标匹配。

3. 条件供给：需要提供填好的输入模板、产品/类目/广告/评论数据、系统 Prompt 与任务 Prompt、自检清单、平台规则复核。反馈来自 06/07 的真实广告和评论数据，回流到 03/04。无需 API key、无需装环境是 README 的说法；01 脚本的运行条件 README 未展开。

4. 主动推进：当前 v0.3 没有定时执行。可依据的是「数据到达后触发诊断」：上架后产生广告/评论数据，触发 06/07 诊断，未达标回流诊断。路线图 V4 才规划「自动化 Agent 系统（定时执行 + 闭环优化）」。所以当前只能按事件/阶段推进，不能算时间触发。

5. 效果验证：`docs/04_Result_Checklist.md` 逐条自检，通过即发布；`Examples/03_Closed_Loop/` 展示诊断→回流→复测；复测达标放量、未达标回诊断。原文没有给出具体提升数字或阈值，所以验证方式主要是自检清单通过 + 真实数据复测。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中没有相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据：仓库 README，58 stars；MIT；v0.3 beta；声称 7/7 Agent 完成；方法论来自 38 页内部 SOP PDF；提供 `prompts/`、`templates/`、`examples/`、`scripts/`、`docs/`；案例产品包括 Electric Scooter、Power Bank、Pet Carrier、Air Fryer、Thermal Bag；闭环案例 `Examples/03_Closed_Loop/`；平台支持表；合规声明和 Gap Register。

局限：我们只拿到 README，没有拿到实际 Prompt、模板、脚本、案例数据，无法验证产出质量、复测数据和提升幅度。仓库自认 v0.3 beta，v1.0 才打通完整工作流并输出一键上架素材包。平台硬指标需要发布前复核。原始 SOP 含违规动作，仓库只做合规改写，不实现这些动作。适用条件：跨境电商运营，尤其 Shopee、Mercado Livre；需要产品、类目、广告、评论数据；迁移到其他业务需要自己重写 SOP 拆解和模板。README 中「稳定在老手水平线」「直译英文 Listing 的 CTR 结构性偏低」「闭环是分界线」等属于作者主张，未给数据。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用：选 1 个产品 + 1 个平台（优先 Shopee 或 Mercado Livre），只跑一条短闭环：01 市场分析（用 `scripts/` 算指标）→ 02 产品策略（主卖点收敛成唯一一句）→ 03 Listing 生成 → `docs/04_Result_Checklist.md` 自检。若已有上架产品，直接从 06 广告诊断 + 07 评论诊断开始，把结论回流到 03/04 修改 Listing/主图，做前后复测。

操作：复制对应模块输入模板 → 填写 → 把系统 Prompt + 任务 Prompt + 模板交给任意 LLM → 自检 → 发布/上架 → 收集广告和评论数据 → 06/07 诊断 → 回流 03/04 → 复测。可先用 `Examples/` 里的同品类案例跑通，再换自己的产品。

验证指标：自检清单逐条通过率；发布前是否满足平台硬指标；修改前后同一产品的广告漏斗指标与 ROI（原文只提到漏斗诊断、盈亏线核算、预算/ROI 模型和复测，未给具体阈值）；评论中误解型问题是否减少；复测是否达标。原文未提供量化提升数据，因此只能做前后对比和自检通过判断，不能直接引用其效果数字。
