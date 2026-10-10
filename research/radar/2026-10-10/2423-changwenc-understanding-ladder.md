# ChangWenC/understanding-ladder

- 结论：**值得一试**。先把仓库里那段可复制的“80% 到 ASD-STE100”提示词拿来用，再考虑安装成 Agent Skill，让 AI 按内容类型自动选最低够用的解释形式（文本→图表→交互页→视频）而不是一律甩长文本；理由是原文给出了可照做的安装命令、提示词和内容—形式映射表，但只有作者主张与手工示例，没有基准数据，核心规则又放在未抓取的 SKILL.md 里，适合小范围试而非直接写死进手册。
- 原文：https://github.com/ChangWenC/understanding-ladder
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-10T10:48:58.156Z

## 是什么

`understanding-ladder` 是一个 Agent Skill 仓库，把 Karpathy 提出的“理解阶梯”（understanding ladder）做成了可安装的技能：LLM 输出几乎免费，**理解**才是瓶颈，所以不要接受大段文字，而是要求更容易理解的形式。原帖把形式排成四级，每一级“比上一级更好”：

| 阶梯 | 形式 | 原文给的理由 |
|---|---|---|
| 1 | ASD-STE100 受控英语文本 | 一句一个意思、一词一个含义 |
| 2 | 图表 | 结构一次性铺开，而不是逐行读 |
| 3 | 交互 HTML 页面 | 拖动参数，直接看结果变化 |
| 4 | 3Blue1Brown 风格讲解视频 | 动画+旁白，适合随时间展开的过程 |

仓库包含两个 skill：`understanding-ladder` 负责**分类内容并推荐能完全回答问题的最低阶梯**再产出；`plain-chinese` 是中文版的第一级规则集（15 条，分为词、句、段、该删的、该留的），`understanding-ladder` 在中文输出时自动调用它。

## 具体做法（编号步骤）

1. **前提**：使用支持 Agent Skills 的客户端（原文列出 Claude Code、Codex、Cursor 等）。
2. **安装（三选一）**。
   - 通用方式：
     ```bash
     npx skills add ChangWenC/understanding-ladder
     ```
   - Claude Code 插件：
     ```text
     /plugin marketplace add ChangWenC/understanding-ladder
     /plugin install understanding-ladder@understanding-ladder
     ```
   - 手工克隆到 Claude Code 全局 skills 目录：
     ```bash
     git clone --depth 1 https://github.com/ChangWenC/understanding-ladder.git
     cp -r understanding-ladder/skills/* ~/.claude/skills/
     ```
3. **直接提问触发**，技能靠 description 自动命中，原文给的示例：
   ```text
   Help me understand how learning rate affects convergence.
   Explain the TLS 1.3 handshake the clearest way.
   An agent wrote this plan — help me see what it actually does.
   Walk me through the Fourier series from rung 1 to rung 4.
   ```
4. **不想安装时的降级方案**：直接粘贴下面这段提示词（原文称是 Karpathy 的“80%”加上最关键的一条规则）：
   ```text
   Write about 80% of the way to ASD-STE100: one idea per sentence, one term per meaning, active voice, no filler. Cut nothing — keep every fact, number, condition, and hedge; just make the sentences clean.
   ```
5. **让它按内容自动选形式**（这是技能的核心分派表，照此判断输出该长什么样）：
   - 定义、事实、流程 → 阶梯 1 文本（英文约 80% ASD-STE100，中文用 `plain-chinese`）
   - 过程、因果、状态、组件 → 阶梯 2 图表（Mermaid / SVG + “这张图怎么读”）
   - 某个参数会改变结果 → 阶梯 3 单文件 HTML，带滑块，双击即可打开
   - 随时间展开的推导 → 阶梯 4 视频：出分镜 + 旁白，交给 [showtime](https://github.com/FavioVazquez/showtime) ≥ 0.4.0 用 `--from-storyboard` 渲染
6. **遵守三条贯穿所有阶梯的规则**：不删内容（用简单语言，不是更少内容，每个数字、条件、限定词都要留下）；先出草稿（任何图表、页面、视频都从一份可检查的阶梯 1 文本草稿开始）；结尾附“该检查什么”。
7. **阶梯 4 的渲染前提**：技能只负责写 storyboard，渲染由外部视频工具完成，例如：
   ```text
   showtime new <template> <dir> --from-storyboard storyboard.md
   ```
   （原文说明支持英文或中文表头。）

## 对应的研究问题

- **能力发现**：把“解释一件事”从默认的长文本升级为“按内容类型自动选择呈现形式”，这是通常不会想到交给 AI 的一类工作——不仅是写内容，而是决定用什么形式表达最省理解成本。
- **任务匹配**：原文给出了明确的内容类型 → 阶梯 → 输出形式的映射，并强调选择**最低的、足以完整回答问题的**阶梯，不要爬得比问题需要得更高。这是“什么样的输出适合什么样的任务”的可执行判据。
- **条件供给**：需要一个支持 Agent Skills 的环境和安装权限；过程上要求先产出阶梯 1 的文本草稿供人核对（相当于给人一个可检查的中间物），以及每次输出末尾附“该检查什么”；中文输出依赖 `plain-chinese` 规则集。
- **主动推进**：原文没有提到由时间、事件或状态触发、持续运行的机制，此条无依据。
- **效果验证**：原文只给了原则性提示——“更容易理解 ≠ 已验证”，并解释“精致的产出会让人放松警惕，动画里的错误比文字里的错误更有说服力”，因此每个输出都附“该检查什么”。没有给可量化指标。

## 与已有做法的关系

对照清单：

- **Agent skills（concept，adopt）**：本仓库正是以 Agent Skill 形式分发，README 顶部标注兼容 Claude Code / Codex / Cursor，安装方式就是 skills 生态的标准命令，是这一概念条目的具体实例。
- **Claude Code（tool，adopt）**：提供了 Claude Code 插件的安装命令和全局 skills 目录的手工安装路径。
- **Cursor（tool，watch）**：原文仅在兼容列表中提到 Cursor，未给 Cursor 专属步骤。

除此之外，清单中没有更具体的相关条目。原文自己列出的相近工作（`FutureAtoms/karpathy-ladder`、`danyuchn/asd-ste100-skill`、`mzopedia/simplified-technical-chinese`）不在给定清单里，只能作为原文自述的参照。

## 证据与局限

**原文给出的具体材料**：
- 一个可跑的在线 demo，主题是“服务器利用率超过约 80% 后延迟为什么爆炸”，其中第 3 个标签页有一个滑块，把利用率从 90% 拖到 95%——多 5 个点，延迟翻倍；单文件、无依赖、中英切换。
- 中文/英文各有一组前后对照示例（中文说 5 组），以及 `plain-chinese` 的 SKILL.md 链接。
- 仓库星标 30。

**只是作者主张、没有数据支撑的部分**：
- “选择最低足够阶梯”“先出草稿”“结尾写该检查什么”这三条规则是作者倡导的做法，没有对照实验。
- 各阶梯“更好”的排序来自 Karpathy 的帖子观点，不是测量结果。

**作者自己声明的局限**（应原样带入手册的注意事项）：
- 更容易理解 ≠ 已验证；阶梯降低的是理解成本，不是核对成本。
- 阶梯 4 只写分镜，渲染依赖外部视频工具（showtime 0.4.0+）。
- `plain-chinese` 是给 LLM 的轻量规则集，不是完整写作标准；句长之类的数字是经验法则，**未经过阅读研究检验**。
- 示例是照着 skill 做出来再手工检查的，只表明方向，不是基准测试。

**适用条件**：需要支持 Agent Skills 的客户端；中文效果依赖 `plain-chinese`；本次抓取到的只有 README，分类逻辑细节和 15 条中文规则原文在未抓取的 SKILL.md 里，无法据此复现全部规则。

## 怎么试、怎么验证

**最小试用（零安装，先做这一步）**：挑一份你自己写的、事实密集的技术说明或状态更新，把上面第 4 步那段“80% 到 ASD-STE100”提示词连同原文一起丢给模型，让它重写。

**进阶试用**：按第 2 步安装 skill，然后分别拿三类内容各一条去问——一条定义/事实、一条流程或因果关系、一条含“某个参数会改变结论”的说明——观察它是否分别落到文本、图表、交互页，以及有没有把简单问题过度升级成 HTML 或视频。

**判断有没有改善的指标**：
1. **事实保全**：逐条比对原文与产出，数字、条件、限定词（hedge）是否一个没少——这是原文最强调的一条，也是最容易失败的一条。
2. **理解成本**：让一个不了解背景的同事读，记录他需要追问几次、读完需要多久。
3. **形式是否够用而非过度**：产出形式是不是刚好够回答问题；如果一条简单定义被做成了动画视频，说明分派逻辑没生效。
4. **警惕反向效果**：特意在内容里留一个错误或遗漏，看自己是否因为产出“看起来精致”而漏检——这正是原文所说的“精致产出降低警惕”。

**失败信号**：简化时丢掉了 hedge 和条件；或者阶梯选择总是往上跳，把任何输入都做成图和视频。
