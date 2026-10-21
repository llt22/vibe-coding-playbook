# mengwEX/dsh-block-ptc

- 结论：**值得一试**。如果团队正在使用 DeepSeek Harness 的 PTC 模式，可以按 README 的安装步骤和 block 使用流程先做小范围试用，把模型自己写的交接摘要当作可控的上下文边界；如果不用这套宿主，就只借鉴它的机制。理由：安装、配置、工具调用和收尾规范都能照着做，但它只是有 37 个 star 的社区插件，只在一个宿主版本上做过实测，节省 token、降低成本等收益连作者自己都声明尚未验证。
- 原文：https://github.com/mengwEX/dsh-block-ptc
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T12:06:38.973Z

## 是什么
dsh-block-ptc 是 DeepSeek Harness（DSH）的社区插件（v0.4.0，MIT，37 stars），为 PTC 模式提供「黑板块（block）」式的上下文管理。机制是：模型每次调用 `run_code` 时，在 description 中用 `[block: <ids>] <goal>` 给这条消息打上块标签；当某个块的内容不再需要时，模型在程序里调用 `tools.block_compact({ ids, content })`，用**自己写的**交接摘要替换该块从最早到最晚出现的整段消息。原始消息仍保留在 append-only 会话日志中，人看到的 transcript 完整，模型的下一次请求看到摘要，回放保持确定性。它不会触发 DSH 内置的自动压缩引擎，也不额外调用摘要模型。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：DSH `>=0.2.1-rc.2`，随附 Cordis `>=4.0.5`；插件零运行时依赖（仅 `node:crypto`）。安装单位是 profile **bundle**，只新增一行 `dsh.profile.bundles` 和一个 `block-ptc` preset，不改动原有的 `ptc` preset。

1. **安装（推荐 npm 方式）**：在 Harness Plugin Manager 中找 `dsh-block-ptc` 安装，或让启用了 Plugin Manager 工具的 agent 执行：
   ```
   plugin_manager  install_bundle  dsh-block-ptc
   ```
2. **安装（本地 checkout）**：
   ```sh
   git clone https://github.com/mengwEX/dsh-block-ptc.git
   ```
   然后通过 Plugin Manager 安装绝对路径：
   ```
   plugin_manager  install_bundle  /absolute/path/to/dsh-block-ptc
   ```
3. **手工安装（与上面等价）**：编辑 `~/.dsh/profiles/<profile>/package.json`，原样填入：
   ```jsonc
   {
     "dependencies": { "dsh-block-ptc": "link:/absolute/path/to/dsh-block-ptc" },
     "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-block-ptc"] } }
   }
   ```
   在该目录下运行 pnpm。
4. **重启一次应用**：loader 按解析后的 URL 缓存插件模块，安装 bundle 会改变组合，不重启会继续跑旧模块。
5. **新建会话时选择 Block PTC preset**：preset 出现在会话 preset 选择器里名为 **Block PTC**。
6. **每次直接调用 `run_code` 都必须带 header**（guard 会强制，否则拒绝，提示 `"Every run_code call, including the first"`；被拒的调用本身不会被打标签，带上 header 重试即可）：
   ```
   run_code({ description: "[block: <ids>] <goal>", code })
   ```
   header 规则：`[block: <ids>]` 必填、逗号分隔、非空、唯一，id 不得含逗号、方括号、换行；`<goal>` 必填，与 header 同一行。同一条 assistant 消息里多个调用的 id 取并集，并作用于整条消息（含其前的 thinking/text）及其工具结果。
7. **在程序内收尾一个块**：
   ```
   await tools.block_compact({ ids, content })
   ```
   `content` 的写作规范（照做）：完整保留后续工作仍需的信息，细化到可以直接接着做；对不再需要的信息简要概括，删掉无关与重复内容；**准确保留用户的要求、纠正和约束**；记录已完成的工作、结果、未完成事项和下一步。
8. **掌握收尾时机**：围绕相对独立的**工作单元**划分块，做同一件事时复用同一 id；只在「内容不再需要」或「结果已向用户汇报、要转向其他工作」时 compact。**仅仅完成一个工作步骤，不构成 compact 的理由**；后续执行、回复或讨论还要用的内容要留着。
9. **读返回值判断状态**：成功时返回 `{ replaced, tokensFreed, ids? }`；若工具结果或其他压缩仍在挂起，返回 `{ replaced: 0, tokensFreed: 0, pending: true, requestSeq, note }`——这只表示已排队，不代表已替换。
10. **自查安装是否正常**：
    ```
    npm run check
    node tests/logic.test.mjs
    ```
    可选的原生检查（需 DSH 已安装的服务路径）：
    ```
    node tests/native-session.mjs /path/to/dsh-session/lib/index.js /path/to/dsh-tools/lib/index.js
    node tests/native-prompt.mjs /path/to/dsh-tools/lib/index.js
    ```
11. **卸载 / 停用**：
    ```
    plugin_manager  remove_bundle  dsh-block-ptc
    ```
    停用而不删包：`plugin_manager set_bundle dsh-block-ptc enabled=false`，两者都需重启。

**排查要点（原文表格中可照做的几条）**：preset 不在列表 → 查 `dsh.profile.bundles` 与 `plugin_manager list_bundles` 后重启；报 `"invalid config: $.mode expected native | ptc but got both"` → 老 0.2.x bundle 装在 DSH 0.2.1+ 上，升级到 0.3.0 并重启；摘要报 `"no current content for ids"` → 该 id 在当前界面从未出现在 `run_code` header 中，检查拼写（已摘要过的 id 是关闭态）；块一直不压缩 → 从未用 `block_compact` 关闭，内容会留到自动压缩时被折进通用摘要；会话里压缩突然失效 → 存在没有配对 `compaction/end` 的 `compaction/start`（持久锁），本插件每次失败都会自己闭合括号，若是旧版本遗留则新开会话。

## 对应的研究问题
- **能力发现**：把「上下文保留哪一段、丢哪一段」从按 token 大小的自动压缩，交给模型按**工作单元边界**自主决定，并且由模型自己撰写交接摘要（不额外调用摘要模型）。这是原文最核心、也最容易被忽略的一项能力：模型可以维护自己的「工作记忆」结构。
- **任务匹配**：适配「一个会话里有多个相对独立子任务、需要跨任务交接」的长会话（原文快速上手示例：先聊 tokenizer，再转到 lexer，转场时整理前一个块）。不适配单块连续、信息强耦合、或需要逐字回溯原始对话的任务——README 明确说，被省略的信息在后续请求中就不存在了。
- **条件供给**：需要 (a) DSH 宿主 + PTC 模式 + `block-ptc` preset；(b) header 规范已写进系统提示、原生工具描述与参数 schema（插件自带，SDK 示例同格式）；(c) 模型愿意遵守 `content` 的写作规范；(d) guard 作为强制层，拒绝不带 header 的直接调用。权限与依赖层面：零外部 import，只有 `node:crypto`，profile 以符号链接方式安装也不会因裸标识符解析失败。
- **主动推进**：**不是**时间/事件/状态触发的持续型自动化。触发点是模型在对话内自我判断「要转工作了」，以及插件用 `session/event` observer 在 append 边界之外调度排队中的补全。要它「自动跑」，得靠上层会话驱动去发起。
- **效果验证**：插件自己能给出 `replaced`（替换了多少条消息）与 `tokensFreed`（被替换消息的估算 token，**不含**新摘要的成本）。但原文明确：`tokensFreed` 不是 provider 的 cache-hit 度量；上下文变小不保证缓存命中率更高或账单更低。也就是说，验证必须落到外部指标上（见下一节）。

## 与已有做法的关系
清单中相关条目：**DeepSeek Harness（watch）**——本插件是它的生态扩展，可视为 DSH 在「上下文供给」方向上的补丁/参考实现，也反过来构成评估 DSH 是否值得从 watch 上调的一个观察点。**DeepSeek（try）** 是模型供应方，与本插件的机制无关，只作为宿主的底座。**Semble（try）**、**Laya（watch）** 与本文无任何对应关系。

## 证据与局限
**原文给出的证据**：安装/配置/工具调用/返回值/排错的具体形态（可直接照做）；快速上手给出了可观察的结果样例 `{"replaced": 3, "tokensFreed": 346}`；提供了 `npm run check` 与 `tests/logic.test.mjs` 的逻辑测试，覆盖 header 解析、工具注册、guard、完整压缩事务、失败仍释放锁、宿主 API 存在性检查；另有两个可选的原生检查，验证工具 schema、原生 append/replay、插入的用户消息替换，以及通过真实 SystemPrompt/Tools/Cordis 组装初始请求。
**只是作者主张、没有量化对照的部分**：「自动压缩不知道最近四十条是一个子任务、接下来十条是另一个，所以让模型自己划线更好」——这是论证，不是实验；`docs/assets/context-comparison.en.png` 明确标注为**机制示意，不是 API benchmark**，且基线尚未触及自动压缩阈值。
**局限与适用条件**：一次摘要只能替换一个从最早到最晚的连续区间，区间内有受保护的 system/developer 消息则整段被拒（不会只替换前缀）；被省略的信息后续不可得，摘要必须自己写全；块是 per-session 的，子代理各跑自己的上下文与块；peer 依赖只声明下限、无上限，新宿主只是「允许加载」，事件语义与 preset 配置仍需重新验证（本次发布只用 DSH 0.2.1-rc.2 做过 live 验证）；两项原生检查都离线，**不跑模型**，因此不验证实际块选择、压缩时机与信息保留质量。

## 怎么试、怎么验证
**最小试用**：在一个 DSH 0.2.1-rc.2 实例上装 bundle → 重启 → 新开 Block PTC 会话 → 选一个含 4–6 个相对独立子任务的真实任务（例：读仓库 → 讲 tokenizer → 讲 lexer → 写并跑测试），每个子任务一个 block id，转场时 compact 前一个块；同一任务再用默认 `ptc` preset 跑一遍作基线。

**判断改善的指标**：
1. **上下文占用**：同一任务每次请求的输入 token 曲线（对比基线），看压缩后是否真降。
2. **账单与缓存命中**：实测 provider 侧缓存命中与费用。原文明确警告「更小的上下文不等于更高缓存命中或更低账单」，所以这一项必须实测，不能拿 `tokensFreed` 当结论。
3. **信息保留率**：在后续步骤里抽查是否还记得用户此前给出的要求、纠正与约束（README 要求 summary 必须完整保留这些）；记录「用户不得不重述」的次数。
4. **返工次数 / 完成时间**：块边界划得好不好，最直接体现在这里。
5. **机制健康度**：是否频繁出现 `pending: true`、guard 拒绝、以及 `compaction/start` 无配对 `end` 导致的压缩停摆。

**判定规则（建议）**：上下文占用与账单不上升，且「重述次数/返工次数」不增加、关键约束零丢失，则继续用并可写进手册；若 token 降了但账单或缓存命中变差、或出现关键信息丢失导致返工，则结论降为 study——只借鉴「模型自写交接摘要 + 完整日志保留 + 确定性回放」这套设计，不绑这个插件。
