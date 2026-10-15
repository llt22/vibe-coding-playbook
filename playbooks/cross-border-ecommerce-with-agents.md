# 让跨境电商 Listing 从生成到复测走一条可自检的闭环

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把有明确 SOP、可模板化输入、可清单自检的跨境电商运营环节，拆成可复用 Agent 工作流，并用广告/评论数据回流复测 Listing。
> 先试这一步：选 1 个 Shopee 或 Mercado Livre 产品，只跑 01 市场分析→02 产品策略→03 Listing→自检 这条短闭环。
> 最近修订：2026-10-15

## 解决什么问题
针对有明确 SOP、输入可模板化、输出有清单可自检的跨境电商运营任务，提供一套可复用 Agent 工作流：从市场分析、产品策略、Listing 创意、图片/视频、广告优化到评论分析，并把 06/07 的真实广告和评论数据回流到 03/04，形成“生成→上架→诊断→修改→复测”的闭环。

## 适用与不适用
适用：跨境电商运营，尤其 Shopee、Mercado Livre；需要产品、类目、广告、评论数据；任务有明确 SOP、输入可模板化、输出有清单可自检。
不适用或谨慎：只想拿一个工具直接生成、不准备输入模板和真实数据；平台硬指标不复核就想发布；迁移到其他业务但不重写 SOP 拆解和模板；希望当前就定时自动执行。当前 v0.3 没有定时执行，只能按事件/阶段推进；路线图 V4 才规划“自动化 Agent 系统（定时执行 + 闭环优化）”。

## 前置条件
- README 称不需要 API key、不需要装环境；但 01 的市场指标要由 scripts/ 计算，脚本具体命令 README 未展开，需到仓库对应目录查看。
- 准备好填好的输入模板：01 需要类目导出数据；06 需要广告数据；07 需要评论数据；03/04/05 需要 02 产出的主卖点和产品要求。
- 输入契约化：缺字段就不应让模型编参数。
- 发布前以平台后台实时规则复核硬指标。
- 涉及参数虚标、品牌词、夸大宣传，Prompt 里做硬拦截，不是建议。

## 操作步骤
做法 A：新品或没有广告/评论数据时——先跑短闭环。

1. 选平台和产品。Shopee、Mercado Livre 为一等支持；Amazon、TikTok Shop、Shopify 只有字段适配。前提：确认平台硬指标，发布前以平台后台实时规则为准。预期结果：确定要跑的产品和平台。参考 docs/02_Platform_Output_Spec.md。
2. 复制输入模板。进入对应模块的 templates/ 目录，复制输入模板：
```text
01 市场分析：input_category_research
02 产品策略：input_strategy_brief
03 Listing：input_product_brief
04 图片：input_image_brief
05 视频：input_video_brief
06 广告：input_ad_data
07 评论：input_review_batch
```
前提：按要跑的模块取模板。预期结果：得到对应输入模板。
3. 填写产品信息。README 称约 10 分钟。前提：01 需要类目导出数据；03/04/05 需要 02 产出的主卖点和产品要求；缺字段就不应让模型编参数。预期结果：输入模板填好，字段契约明确。
4. 把「系统 Prompt」+「任务 Prompt」+「填好的模板」交给任意 LLM。Prompt 在 Agents/<模块>/prompts/。各模块任务 Prompt 文件名：
```text
01：00_system · 01_category_precheck · 02_market_analysis
02：00_system · 01_product_decision · 02_pricing_and_sku
03：00_system · 01_keyword_to_title · 02_description_builder · 03_compliance_guard
04：00_system · 01_image_plan_9grid · 02_image_prompt_generator
05：00_system · 01_script_and_storyboard · 02_ai_video_and_voice
06：00_system · 01_funnel_diagnosis · 02_budget_roi_model
07：00_system · 01_classify_and_attribute · 02_misunderstanding_detector
```
前提：已经填好模板；如跑 01 指标需用 scripts/ 计算，Agent 只负责解读，脚本具体命令 README 未展开，需到仓库对应目录查看。预期结果：得到该模块输出。
5. 用 docs/04_Result_Checklist.md 逐条自检，通过即发布。前提：拿到模块输出。预期结果：每个模块交付时给一份自检清单，逐条打勾才算完成。
6. 如需上架，按推荐顺序跑完整链路。README 以 Patinete Elétrico 为例给出：
```text
类目导出数据 → 01 市场分析（+脚本算指标） → 02 产品策略（定价+SKU）
→ 03 Listing Creative（标题/卖点/参数）
→ 04 Product Image（主图/详情图） 和 05 Product Video（脚本/分镜/配音）
→ 上架
→ 06 广告漏斗诊断、07 评论八类归因
→ 回流修改 03/04 → 复测 → 达标放量 / 未达标回诊断
```
前提：02 决定卖点后，03/04/05 才能开工，主卖点必须收敛成唯一一句；06 和 07 会把结论回流到 03/04。预期结果：闭环而不是一次性生成。参考 Examples/03_Closed_Loop/。
7. 平台硬指标复核。README 给出的表：
```text
Shopee：标题上限 120 字符（前 30 字符权重最高）；白底，最多 9 图；输出 PT-BR / EN / 本地语
Mercado Livre：标题上限 60 字符；纯白底 RGB(255,255,255)，≥800×800，最多 12 图；输出 PT-BR / ES
Amazon：标题 200 字符（建议 80）；纯白底，≥1000×1000；输出 EN
TikTok Shop：标题按站点；竖版 9:16 优先；输出本地语
Shopify：标题建议 70；无硬限制；输出 EN / 本地语
```
前提：发布前。预期结果：满足平台字段/字数/图片等硬指标。所有硬指标以平台后台实时规则为准，发布前请复核。
8. 合规前置。涉及参数虚标、品牌词、夸大宣传，Prompt 里做硬拦截，不是建议。合规改写见 docs/03_Compliance_Guard.md；未实现项见 docs/05_SOP_Gap_Register.md。前提：素材涉及相关风险。预期结果：违规项被拦下或改写，未实现项登记。

做法 B：已有上架产品时——从诊断回流开始。

1. 准备广告/评论数据。前提：06 需要广告数据；07 需要评论数据。预期结果：有 input_ad_data、input_review_batch 可填。
2. 跑 06 广告优化与 07 评论分析。06 做四类漏斗诊断 + 盈亏线核算 + 预算/ROI 模型；07 做八类归因 + 误解型识别 → 详情页修补建议。使用对应 Prompt 文件名。预期结果：得到诊断和修补建议。
3. 把 06/07 结论回流到 03/04，修改 Listing/主图。前提：已有上架产品。预期结果：修改后的 Listing/主图。
4. 复测并判断：达标放量 / 未达标回诊断。预期结果：形成“诊断→回流→复测”的闭环。

怎么选：没有上架数据，选做法 A；已有上架产品，选做法 B。也可以先用做法 A 跑新品，上架后用做法 B 做回流复测。

## 怎么判断变好了
最小试用：选 1 个产品 + 1 个平台（优先 Shopee 或 Mercado Livre），只跑一条短闭环：01 市场分析（用 scripts/ 算指标）→ 02 产品策略（主卖点收敛成唯一一句）→ 03 Listing 生成 → docs/04_Result_Checklist.md 自检。若已有上架产品，直接从 06 广告诊断 + 07 评论诊断开始，把结论回流到 03/04 修改 Listing/主图，做前后复测。

操作：复制对应模块输入模板 → 填写 → 把系统 Prompt + 任务 Prompt + 模板交给任意 LLM → 自检 → 发布/上架 → 收集广告和评论数据 → 06/07 诊断 → 回流 03/04 → 复测。可先用 Examples/ 里的同品类案例跑通，再换自己的产品。

可观察指标：自检清单逐条通过率；发布前是否满足平台硬指标；修改前后同一产品的广告漏斗指标与 ROI（原文只提到漏斗诊断、盈亏线核算、预算/ROI 模型和复测，未给具体阈值）；评论中误解型问题是否减少；复测是否达标。原文未提供量化提升数据，因此只能做前后对比和自检通过判断，不能直接引用其效果数字。原文未给出具体试用时长；以一次自检发布或一次前后复测为最小观察单元。

## 常见坑
- 只拿到 README，没有实际 Prompt、模板、脚本、案例数据，无法验证产出质量、复测数据和提升幅度。
- 仓库自认 v0.3 beta，v1.0 才打通完整工作流并输出一键上架素材包。
- 平台硬指标需要发布前复核，不能把 README 表当作实时规则。
- README 称不需要 API key、不需要装环境；但 01 脚本的运行条件 README 未展开，脚本具体命令需到仓库对应目录查看。
- 原始 SOP 含刷单、诱导评价、虚假举报、参数虚标等平台禁止做法，仓库只做合规改写，不实现这些动作。
- 输入契约化：缺字段就不应让模型编参数。
- 02 决定卖点，03/04/05 才能开工；主卖点必须收敛成唯一一句。
- 06 和 07 会把结论回流到 03/04，这一步是闭环和一次性生成工具的分界线。
- 平台一等支持 Shopee、Mercado Livre；Amazon、TikTok Shop、Shopify 字段已适配。
- 当前 v0.3 没有定时执行；只能按事件/阶段推进，不能算时间触发。路线图 V4 才规划“自动化 Agent 系统（定时执行 + 闭环优化）”。
- 作者主张：“稳定在老手水平线”“直译英文 Listing 的 CTR 结构性偏低”“闭环是分界线”等，未给数据。

## 证据与来源
本手册依据调研《heqiangdiao-wq/AI-Cross-Border-Ecommerce-Agent-Toolkit》整理。
- 数据与来源：仓库 README，58 stars；MIT；v0.3 beta；声称 7/7 Agent 完成；方法论来自 38 页内部 SOP PDF；提供 prompts/、templates/、examples/、scripts/、docs/；案例产品包括 Electric Scooter、Power Bank、Pet Carrier、Air Fryer、Thermal Bag；闭环案例 Examples/03_Closed_Loop/；平台支持表；合规声明和 Gap Register。
- 操作步骤和代码块来自 README 的快速开始、闭环流程图、Prompt 文件名和平台硬指标表。
- 只是作者主张：README 中“稳定在老手水平线”“直译英文 Listing 的 CTR 结构性偏低”“闭环是分界线”等，未给数据。
- 局限：只拿到 README，没有实际 Prompt、模板、脚本、案例数据，无法验证产出质量、复测数据和提升幅度。仓库自认 v0.3 beta，v1.0 才打通完整工作流并输出一键上架素材包。平台硬指标需要发布前复核。原始 SOP 含违规动作，仓库只做合规改写，不实现这些动作。适用条件：跨境电商运营，尤其 Shopee、Mercado Livre；需要产品、类目、广告、评论数据；迁移到其他业务需要自己重写 SOP 拆解和模板。

## 依据的调研

- [heqiangdiao-wq/AI-Cross-Border-Ecommerce-Agent-Toolkit](../research/radar/2026-10-15/3658-heqiangdiao-wq-ai-cross-border-ecommerce-agent-too.md)：值得一试，建议小范围试：选一个 Shopee/Mercado Livre 产品或已有 Listing，按 README 的“模板→Prompt→LLM→自检→上架→06/07 回流复测”跑一条闭环，验证能否稳定产出合规素材；理由是它给出了可复制的步骤和文件结构，但当前只有 README 可见、仓库为 v0.3 beta，效果未经验证。
