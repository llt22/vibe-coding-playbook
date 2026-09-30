# AI Skills with Matt Pocock

- 结论：**值得研读**。先把「用牵引词（如 tracer bullet）指挥 agent」和「把代码库优化成给每天失忆的新同事看」这两条思路拿去研读，并把 grill-me 这类「让 agent 反过来采访你」的 skill 列为下一步找源码的目标；理由是原文只是播客页面上的要点摘要，既没有完整文字稿，也没有给出任何 skill 的提示词原文或配置，无法直接照做。
- 原文：https://newsletter.pragmaticengineer.com/p/ai-skills-with-matt-pocock
- 来源：rss:src-pragmatic-engineer，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-09-30T18:24:11.551Z

## 是什么

这是 The Pragmatic Engineer 播客一期访谈的页面和要点清单，嘉宾是 Matt Pocock（Total TypeScript 课程作者、AI Hero 课程作者，也是流行 skill「grill-me」的创建者）。主题是他如何用 AI 编码 skill 和 agent 来规划、委派和纠偏软件工作。

需要说清楚的是：本次抓到的是节目页正文（介绍 + 9 条 Takeaways + 时间轴 + 参考链接），页面顶部提到「文字稿见本页顶部」，但抓取内容里没有包含文字稿本身，也没有包含任何 skill 的源码或提示词原文。因此下面能提炼的只有概念和方向，不是可复制的操作。

文中的核心概念有：grill-me skill、wayfinder skill、「smart zone / dumb zone」、「牵引词（leading words）」如 tracer bullet、「Memento 驱动开发」、本地 agent vs 云端 agent、agent 是否需要 TDD、tactical programming（战术编程）vs strategic programming（战略编程）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前置说明：原文没有给出任何一条可直接复制的命令、配置或提示词。** 以下步骤是从要点中能还原出的做法骨架，每一步都标注了原文给出的程度。

1. **让 agent 反过来采访你（grill-me）**
   - 做法：创建一个 skill，指示 agent 就某个主题不停地追问用户。原文对其描述是「surprisingly simple and short（出奇地简单和短）：它指示 agent 无休止地采访用户」。
   - 来源：这个做法最早来自 Anthropic 的 Thariq Shihipar，Matt 把它做成了一个 skill。
   - 前提：你的 agent 工具支持自定义 skill 机制。
   - 注意：原文没有给出这个 skill 的提示词原文，只给了它的性质。要照做必须另外去找源码。

2. **用 wayfinder 技能做规划与纠偏**
   - 做法：文中把它列为他用来「plan, delegate, and course-correct with AI agents」的技能之一。
   - 注意：原文只在简介和时间轴（45:02）里提到名字，正文没有任何内容、步骤或提示词。这一条目前只能记为线索。

3. **在指令里植入「牵引词」来改变 agent 的构建方式**
   - 观察：Matt 注意到 agent 倾向于一层一层地搭软件，结果层与层之间出 bug。
   - 做法：读《The Pragmatic Programmer》时他看到「tracer bullet（曳光弹）」这个概念，于是指示 agent 用 tracer bullets 来构建应用（也就是先实现一条「golden path / 黄金路径」）。原文称此后 agent 开始产出更好的代码。
   - 前提：在给 agent 的任务描述里显式使用这个词，而不是只描述「实现这个功能」。
   - 扩展：他因此开始读经典软件工程书，专门收集其他能高效引导 agent 的「牵引词」。
   - 注意：原文没有给出完整的提示词句子，只有「instructed the agent to use 'tracer bullets'」这一层描述。

4. **把代码库优化成「给每天早上失忆的同事」看（Memento 驱动开发）**
   - 原文引述：「想象有个人每天早上醒来都不记得自己是谁，就像《Memento》里的主角。我们一直在为新加入的人优化代码库，所以我们要有史以来最健康的代码库。人能绕过糟糕的代码库，他们会形成记忆，但 agent 做不到；它每次会话都从零开始。所以你需要为那个 agent 优化代码库。而事实证明，软件工程基本功一直在做的正是这件事。」
   - 可执行的推论：把可读性、可理解性、约定清晰度当作第一约束；假设读者（agent）对这份代码没有任何历史记忆。
   - 前提：这条是原则，不是流程；如何落地需要结合你团队的代码规范自行定义。

5. **把 agent 从本地搬到云端**
   - 做法：Matt 正在把编码会话迁到云端 agent，理由是合上笔记本后 agent 仍在运行，而且云端 agent 可以做成本地 agent 做不到的「multiplayer（多人协作）」形态。他发过一条 X：「I'm moving away from my local dev setup. Makes zero sense to me now」。
   - 前提：接受把代码执行放到云端环境。
   - 注意：原文没有给出任何具体的云端工具、配置或迁移步骤，只有一个方向性主张。

6. **对 agent 弱化 TDD，改为要求它交付「代码能工作」的证据**
   - 原文观点：TDD 对人类有用，因为人工作记忆短，一个失败的测试能提醒分心的人还有什么没跑通；但 agent 的上下文窗口更长，所以 Matt 开始让 agent 产出「代码能工作」的证据——用不用 TDD 都可以。
   - 前提：你能接受用「证据」（原文未说明证据的具体形式）替代测试先行。
   - 注意：「证据」到底指什么、怎么要求，原文没有展开。

7. **人退到战略层，把战术层交给 agent**
   - 原文观点：借用 John Ousterhout 对「tactical programming vs strategic programming」的划分，Matt 认为 agent 完全有能力做战术编程，工程师应该把更多时间花在战略层。
   - 注意：这是判断和主张，不是操作步骤。

## 对应的研究问题

- **问题1 能力发现**：文中提出两件一般不会想到交给 AI 的事——(a) 让 agent 反过来采访用户、逼问需求（grill-me）；(b) 把整个「战术编程」层交给 agent，人只做战略判断。
- **问题2 任务匹配**：明确区分了战术层（agent 胜任）和战略层（留给人）；区分本地 agent 与云端 agent——需要长时间运行、需要在人离开后继续、需要多人协作的任务适合云端，原文称本地 agent 做不到这些。
- **问题3 条件供给**：需要给 agent 的包括——一个为「零记忆读者」优化过的可读代码库；在指令中使用「牵引词」（如 tracer bullet）；让 agent 交回「代码能工作的证据」；以及一个支持自定义 skill 的宿主工具（否则 grill-me 这类能力无法落地）。
- **问题4 主动推进**：云端 agent 的卖点正是「合上笔记本它还在跑」，属于可脱离人持续执行的一类。但原文没有给出触发条件、状态跟踪或持续完成的具体机制。
- **问题5 效果验证**：唯一相关的是「要求 agent 提供代码能工作的证据」这一点，用来替代 TDD 对人类的提醒作用。原文没有给出任何判断标准、指标或数据。

## 与已有做法的关系

- **Context engineering（状态 study）**：直接相关。文中专门讨论了「smart zone vs dumb zone」（时间轴 40:46）和「把上下文拆开可以让 agent 保持在聪明区」，这正是上下文工程的核心命题。但正文对这两个概念只有一句话提及，没有展开。
- **Ralph loop（状态 watch）**：相关。参考链接里同时列了 "Everything is a Ralph loop" 和 "Ship working code while you sleep with the Ralph Wiggum technique"，与「云端无人值守 agent 持续产出」的讨论处在同一主题上。但正文没有展开 Ralph loop 本身。
- **Claude Code / Cursor（状态 adopt / watch）**：无法据此建立依据。原文正文没有说这些 skill 跑在哪个工具上；只在赞助商段落里顺带提到了 Claude Code、Codex、Cursor、Linear Agent。把它和 Claude Code 的 skill 机制对应起来是我的推断，不是原文的表述。
- **Pragmatic Engineer（状态 try，来源）**：本条即出自该来源，属于同一渠道的又一期节目。
- 其余条目（清单中的其他 tool / method）在原文中没有出现。

## 证据与局限

**原文给出的可核查事实：**
- Matt Pocock 是 grill-me skill 的创建者，也是 AI Hero 课程作者；他此前的 Total TypeScript 课程累计销售额超过 250 万美元。
- grill-me 的做法源头是 Anthropic 的 Thariq Shihipar。
- 他发过一条 X 帖子「I'm moving away from my local dev setup」，数据为 951K 浏览、467 回复、56 转发、3.54K 点赞。

**只是作者主张、没有数据支撑的部分：**
- 「agent 用 tracer bullets 后开始产出更好的代码」——这是 Matt 自述的主观观察，原文没有对照实验、没有前后对比数据。
- 「云端 agent 比本地更合理」「agent 完全可以做战术编程」「Memento 驱动开发」——都是观点和类比，没有量化证据。
- 上述 X 帖子的高浏览量只说明传播度，不能作为效果证据。

**适用条件与局限：**
- 适用对象是使用 AI 编码 agent 的软件工程师，前提是工作本身是写代码、且使用的 agent 支持自定义 skill。
- 本文是播客节目页，不是操作指南：没有完整文字稿、没有 skill 源码、没有提示词原文、没有命令或配置。所有「做法」都停留在方向层面。
- 「牵引词」的思路来源是《The Pragmatic Programmer》，战略/战术编程的划分来源是 John Ousterhout 的《A Philosophy of Software Design》——这些是经典软件工程概念，不是 AI 时代的新发明，原文也明确说「软件工程基本功一直在做这件事」。
- 因此本研究给出的判断是 study 而不是 try：思路值得研读，但不具备「照着做」的条件。

## 怎么试、怎么验证

**最小试用（不依赖尚未拿到的 skill 源码）**

1. 选一个真实的、中等规模的功能开发任务，先用你现在的默认方式和 agent 做一遍，记录结果。
2. 对同一个任务重做一遍，只在任务描述里加一句「先用 tracer bullet 打通一条端到端的黄金路径，再铺开其余部分」。
3. 再加一个「采访我」的环节：在动手前要求 agent 就需求、边界条件、失败场景连续追问，直到它不再有新问题（这就是 grill-me 的最小近似形态，注意这不是原文给出的提示词原文）。
4. 把「给出代码能工作的证据」写进验收要求，观察 agent 会用什么形式交付。
5. 有云端 agent 条件的话，把同一任务丢到云端跑一次，中途合上笔记本，看回来时进度差多少。

**判断有没有改善的指标**

- 层与层之间的接口 bug 数量（这是原文点名的痛点，最能直接对应 tracer bullet 的效果）。
- 首次提交后需要人工返工的比例，以及返工发生的层次（接口层 vs 内部实现）。
- 需求澄清阶段产生的返工次数（对应 grill-me 的效果）。
- 从下指令到「能跑通的端到端路径存在」的耗时。
- 人离开期间任务是否继续推进（对应云端 agent 的主张）。

**注意**：以上指标是我为验证这些主张而设计的，原文没有提出任何验证方案或基准数据。如果几轮下来接口 bug 和返工比例没有变化，这些「牵引词」在你团队的效果就存疑。
