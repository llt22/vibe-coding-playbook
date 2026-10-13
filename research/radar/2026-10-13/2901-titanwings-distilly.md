# titanwings/distilly

- 结论：**值得一试**。可按 README 给出的最小流程在受支持的 host（建议先用 Claude Code）小范围试：安装 distilly Skill，选一位同事，按其素材优先级（本人长文/评审意见 > 决策性回复 > 群聊）生成 colleague profile，再用真实问题做“带 Skill / 不带 Skill”对照。理由是它把“个人工作方式”固化成可反复调用的 Skill，并给出对话纠正、增量合并不覆盖、版本回滚三条可操作的维护机制；但材料只是 README、项目自述为 demo 版，且没有任何效果数据，所以只值得小范围试，不能直接进手册作为既定做法。
- 原文：https://github.com/titanwings/distilly
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T07:35:23.072Z

## 是什么

Distilly（前身 Colleague Skill / colleague-skill）是一个把某个人的经验、判断、表达方式和做事方法蒸馏成可复用 Person Profile 的创建器，输出打包为 Agent Skill。流程是：消息记录 / 文档 / 访谈 / 公开资料 → Distilly → Person Profile → Agent / Bot。

- 三个“人物家族”，各自有素材采集策略、分析维度和 profile 结构：`colleague`（同事/导师/上下游）、`relationship`（伴侣/家人/朋友）、`celebrity`（公众人物/创作者/虚构角色）。
- 生成的 Skill 名为 `{character}-{slug}`，可安装到支持原生本地 Skill 发现的 host：Claude Code、Hermes、OpenClaw、Codex、DeepSeek Harness、Pi、Grok Build、OpenCode（Grok Bot 仅列为“saved Skill · 预览”，官方文档未描述直接导入本地 `SKILL.md`）。
- 项目自述不克隆人本身，只基于可观察素材建模；MIT 许可，Python 3.9+；引用技术报告 COLLEAGUE.SKILL（arXiv 2605.31264），该论文只覆盖 colleague 家族（前身）。

## 具体做法

**前提**：一个受支持的本地 agent host；Python 3.9+；知道该 host 的 Skills 目录。

1. 安装（两种方式二选一）。
   - 让 agent 自己装，在任意受支持的本地 host 里发：

     ```
     Install Distilly from `https://github.com/titanwings/distilly`, then verify that this host can discover it.
     ```

   - 或人工 clone 到 host 的 Skills 目录：

     ```bash
     git clone https://github.com/titanwings/distilly <DISTILLY_SKILL_DIR>
     ```

     注意：创建者 Skill 的规范名是 `distilly`，要装在名为 `distilly` 的目录下。host 具体路径、迁移、Windows、生成 profile 的安装、凭据配置在 `INSTALL_EN.md`（本材料未给出其内容）。
2. 给自己建 profile（刚上手个人 agent 时）：

   ```
   Use Distilly to set up my profile.
   ```

   它会访谈约 5 分钟，展示 profile，然后把一段短摘要写进 agent 每次会话都读的文件（Claude Code 是 `~/.claude/CLAUDE.md`，OpenClaw 是 `USER.md`），完整 profile 留在本地 `~/.distilly/owner/profile.md`。
3. 给别人建 profile：

   ```
   Use Distilly to create a Person Profile for `<person>`.
   ```

   然后 ① 选 `colleague` / `relationship` / `celebrity`；② 加描述或素材（每个字段都可选）；③ 审阅结果，让 Distilly 生成 profile。
4. 按家族选择素材优先级（原文给的排序，高 → 低）：
   - `colleague`：本人的长文写作（设计文档 / 评审意见）> 决策性回复 > 日常群聊
   - `relationship`：完整聊天记录 > 信件 / 社交帖 / 日记 > 第三方描述（时间跨度越长越好，最好同时包含冲突与修复）
   - `celebrity`：第一人称书籍 / 博客 / 长访谈 > 决策记录（发布、commit、问答）> 可核实的第一人称短帖 > 第三方评论（避免只喂二手解读）
5. 可选：用自动采集通道替代手工上传。可用来源与前置条件：
   - Lark：消息走 API、文档/Wiki 支持，只要输入名字即可自动采集；需要把 App bot 加进相关群。
   - DingTalk：文档支持，消息只能走浏览器（其 API 不支持消息历史）。
   - Slack：消息走 API；需要管理员安装 Bot，免费版仅 90 天。
   - X 公开帖：走 API，可选，经计量型第三方服务 Xquik 做有边界的名人研究候选。
   - 微信聊天记录：SQLite；需先用 WeChatMsg 或 PyWxDump 导出。
   - 手工上传：PDF/图片/截图、Lark JSON 导出、`.eml`/`.mbox` 邮件、Markdown 或直接粘贴。
6. 持续维护（三条机制）：
   - 追加文件 → 自动分析增量 → 合并进相关小节，不覆盖已有结论。
   - 对话纠正：说“他不会这样，他会 xxx” → 写入 Correction 层，立即生效。
   - 每次更新自动归档，可回滚到任一历史版本。

## 对应的研究问题

- **能力发现**：把“某人的工作方式”本身当作可交给 AI 的资产。colleague 家族在 Persona 之外加一层 Work Skill（scope、workflow、输出偏好、经验知识库），等于把设计文档、评审意见里的隐性标准显性化成可调用指令。原文只给了结构与 demo，未给可验证的效果。
- **任务匹配**：匹配依据是素材类型和产出用途，而非任务难度——三家族各有采集策略与结构（colleague 加 Work Skill 模块；relationship 用表达 DNA / 情绪触发 / 冲突模式 / 修复模式；celebrity 用六维研究工具链 + 心智模型 / 决策启发式 / 外部评价对照）。工具侧给了 8 个 host 的原生 Skill 发现适配，Grok Bot 只能手动迁移到 saved Skill。
- **条件供给**：素材优先级排名、各采集通道的权限前置（Lark 需 bot 入群、Slack 需管理员、DingTalk 走浏览器、微信需先导出）、素材格式清单，以及“每次会话要读的摘要文件路径 + 本地完整 profile 路径”。反馈通道是对话纠正写 Correction 层，加上追加文件的增量合并不覆盖。
- **主动推进**：只看到事件式更新（追加文件、对话纠正触发合并与归档），原文没有给出时间触发、状态触发或自动持续运行的机制；Grok Bot 的自动保存 Skill 仍是预览。
- **效果验证**：原文没有效果指标或评测方法，只有“素材质量 = profile 质量”的定性主张，以及一份未在本材料中展开的技术报告链接。

## 与已有做法的关系

- **Claude Code（adopt）**：Distilly 明确支持在 Claude Code 上原生发现本地 Skill，并把 owner 摘要写进 `~/.claude/CLAUDE.md`。可作为“把专家/角色经验做成 Claude Code Skill”的一条具体可试路径。
- **OpenClaw（watch）、Hermes（watch）、OpenCode（watch）、DeepSeek Harness（watch）**：都被列为支持的本地 host，其中 OpenClaw 还支持把摘要写入 `USER.md`。可作为这几个 host 的 Skill 兼容性信号。
- **DeepSeek（try）**：仅在 “DeepSeek Harness” 这一 host 名称中出现，与 DeepSeek 模型本身无直接关系。
- **arXiv（try）**：仓库引用 COLLEAGUE.SKILL 技术报告（arXiv 2605.31264，含 BibTeX），是本线索唯一可查的正式出处，但原文未给出其内容；relationship / celebrity 的论文标注为 planned。
- 清单中没有关于“个人经验蒸馏 / Skill 自动生成”的专门条目。

## 证据与局限

**原文给出的可核实内容**：可复制的安装命令与提示词；素材来源表及其前置条件；三家族的 profile 结构与 Work Skill 模块；三条维护机制；三个演示样例（Karpathy、字节 L2-1 后端、暗恋对象）以及作者自述的 20K ⭐ 里程碑（本次元数据记为 25,547 stars）；MIT 许可。

**只是作者主张**：三个 demo 都是挑选过的对话展示，无对照组、无评测数字；“不克隆本人、只做 source-grounded 建模”“素材优先级排序”“素材质量 = profile 质量”均为作者经验判断且无数据。

**局限与适用条件**：本材料只是仓库 README，`INSTALL.md` / `INSTALL_EN.md` 与 `SKILL.md` 的实现细节都没给到，无法核对；README 自述仍是 demo 版；Grok Bot 的安装路径未验证；DingTalk 消息历史只能走浏览器、Slack 免费版仅 90 天，都是硬约束。另外，素材涉及他人聊天记录与个人信息，原文完全没有讨论授权与隐私问题，实际试用前须自行解决。

## 怎么试、怎么验证

**最小试用**（建议在 Claude Code 上，1 人、1 个可公开素材的岗位）：

1. 把 distilly 按上面第 1 步装好，确认 host 能发现该 Skill。
2. 挑一位同事，只喂其设计文档/评审意见（按原文最高优先级素材），生成 colleague profile。
3. 准备 3–5 个该同事平时会被问到的真实问题（如“评审这个 API 设计”），分别问“不带 Skill 的通用 agent”和“装了该 Skill 的 agent”，自己看输出能不能直接用。
4. 同一批问题再只喂群聊素材重建一次，对照两次输出，验证原文的素材优先级排序是否成立。
5. 追加一份新文档，确认旧结论没被覆盖；再用一句“他不会这样，他会 xxx”纠正，确认立即生效且可回滚。

**判断有没有改善的指标**（原文未给，需自定并记录基线）：

- 直接采纳率：生成结果被直接用 / 小改后用的比例，对照无 Skill 版本。
- 格式合规：输出是否符合团队既有规范（如统一 `{code, message, data}` 响应格式）、是否先追问影响面。
- 纠正轮数：需要“他不会这样”纠正的次数，应随使用下降。
- 稳定性：同一问题重复询问，关键判断是否一致。
- 可溯源性：输出中的判断能否指回所提供的原文素材，出现编造即视为失败。

**淘汰条件**：若纠正轮数不下降、或输出无法溯源到素材（出现编造），则退回到 study——只借鉴“Persona + 家族模块 + Correction 层 + 增量合并不覆盖”的结构，不实际使用该工具。
