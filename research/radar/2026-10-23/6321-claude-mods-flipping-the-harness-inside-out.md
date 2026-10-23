# Claude Mods: Flipping the Harness Inside Out

- 结论：**值得研读**。把“注意力接口/可编程 harness”作为设计思路来研究：先在自己的 Claude Code 工作流里识别摩擦点，用内置 mod 做小范围观察；原文只有概念和体验案例，缺少可复制的 mod 代码、安装配置与提示词，暂不宜直接采用。
- 原文：https://latent.space/p/claude-mods/
- 来源：rss:src-latent-space，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T12:51:20.751Z

## 是什么

Claude Mods 是 Claude Code 的插件机制：mod 由 TypeScript/JavaScript 函数组成，运行在 Claude Code 内，响应 prompt、tool call、界面渲染等事件，可以观察事件、修改渲染方式，或替代默认行为。原文把它定义为“agent harness 的 middleware”，并主张 harness 正从“面向机器”翻转为“面向人”的 Attention Interface：决定 agent 何时打断你、给你看什么、需要你做哪些决策。

文章的核心不是某个现成工具，而是一个设计方向：人和 agent 可以一起编写人机交互层。Claude Code 内置了教 Claude 写 mod 的 skill，因此可以用自然语言描述想要的 mod，让 Claude 构建。原文还列出六个内置 mod：agents-md、diff、plugin-authoring、sec-default、telemetry、you-should-know。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 说明：原文没有给出 mod 的完整代码、安装命令或可复制的提示词，以下只能整理文中明确提到的操作入口和试用流程，不能视为完整配置手册。

1. **前提：已使用 Claude Code CLI 或 Desktop。** 运行 `/plugin`，打开 Installed，查看 Built-in 下列出的内置 mod。

```
/plugin
```

2. **开启 `You Should Know`。** 它是 Anthropic 内置 mod，默认关闭。作用是运行一个 side-agent，观察主 agent 的工作，把“对输出有实质影响、但埋在 agent trace 里不容易看见”的工具调用或决策标记出来。原文案例中，它发现 `CompareView.swift` 及约 45 个文件已有未提交工作，提示先 commit 或 stash，避免后续丢弃 demo 编辑时误删。

3. **按“发现摩擦—描述 mod—让 Claude 构建—试用—调整”的流程做一个最小 mod。** 前提是使用支持该内置 skill 的 Claude Code。原文只说明可以“用平实语言要你想要的 mod，Claude 会构建它”，没有给出具体提示词模板，因此这一步只能作为方向：先找一个你反复检查、反复纠正 agent 的具体摩擦点，再让 Claude 针对该点写一个只在特定事件触发的 mod。

4. **了解 `Next Steps Supervisor` 的触发条件。** 它只在“一轮中编辑了文件、运行了命令，或进行了 8 次及以上工具调用”之后运行；运行后标记六类信息，并给出一个可点击的下一步建议按钮。原文说它属于作者开源的 ModSmith 插件，但没有给安装命令，不能直接照抄。

5. **用关闭和改触发条件来控制噪音。** 原文明确给出 `/supervisor off` 用于关闭该 supervisor；并说因为 mod 是自己的，可以修改它什么时候运行。其他 mod 的关闭方式原文未给。

```
/supervisor off
```

6. **安全前提：mod 以你的权限运行。** 原文明确说 mod 能读写文件、看到你发送的每个 prompt、花你的用量，而且“mods aren’t sandboxed”；内置 mod 在 `--safe-mode` 下仍会运行。因此只应安装自己写的或官方内置的 mod；安装别人的代码前要先读代码。

```
claude --safe-mode
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现：AI 已经能做哪些还没想到交给它的工作。** 原文给出两类：一是让 Claude 根据自然语言描述编写 mod，定制 Claude Code 的交互行为；二是让 side-agent 在主 agent 工作时观察 trace，提示人可能漏掉的重要信息，并给出下一步建议。

2. **任务匹配：什么工作适合怎样的模型、工具和协作方式。** 适合 Claude Code 的 CLI/Desktop 工作流，尤其是需要人类监督、审查、决定下一步的编码任务。mod 用 TS/JS 写，挂在 prompt、tool call、render 等事件上。协作方式是“人发现摩擦，Claude 写 mod，人试用并调整”。不适合把完整代码审查完全交给自动路由；原文引 Cursor 文档也强调 PR Routing “不替代完整代码审查”。

3. **条件供给：需要提供哪些信息、工具、权限和反馈。** 需要 Claude Code 环境、插件权限、会话/agent trace 上下文、事件钩子，以及人对提示是否有用的反馈。安全上需要信任 mod 代码，因为 mod 不沙箱、权限等同用户。

4. **主动推进：哪些工作可由时间、事件或状态触发并持续完成。** mod 本身就是事件驱动：可响应 prompt、tool call、界面渲染。`You Should Know` 在主 agent 工作时持续观察；`Next Steps Supervisor` 在“编辑文件、运行命令或 ≥8 次工具调用”的 turn 后触发。原文还提出一个尚未实现的设想：后台读取 session transcripts，发现人反复纠正或反复手工检查的地方，主动建议一个 mod。

5. **效果验证：怎样判断确实改善了结果。** 作者给出的判断标准是：它是否暴露了你本来会漏掉的东西、是否让决策更容易、是否让你能直接行动而不被更多输出分心；如果都不是，就只是装饰。原文还用触发频率和 token 成本作为反面指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：Claude Mods 是 Claude Code 的插件/中间件机制，宿主就是 Claude Code。原文说 Claude Code 已有六个功能以内置 mod 形式存在，说明其部分能力已被模块化。
- **Agent Trace（study）**：mod 可以观察 agent trace；`You Should Know` 的卖点正是从 trace 中挑出“有实质影响但不易看见”的调用和决策。
- **Cursor（watch）**：原文把 Claude Mods 与 Cursor 的 PR Routing & Approval 对比。Cursor 是团队写策略、固定工作流执行，决定哪些 PR 值得人看；Claude Mods 是人自己写交互层。两者都在做“注意力分配”，但控制点不同。
- **Latent Space（adopt）**：文章来源，作者此前也写过 agent harness 演进相关文章，文中观点属于同一脉络。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的证据/案例：**
- 作者称自己用 Claude Mods 数周，把 Claude Code 调整到自己的 AI 工程工作流。
- `You Should Know` 的真实案例：主 agent 修改 `CompareView.swift` 时，该文件及约 45 个文件已有未提交工作；mod 提示先 commit/stash，避免误丢。
- `Next Steps Supervisor` 的触发数据：10 月 15 日安装后，作者 111 个 turn 中有 99 个满足触发条件，说明几乎每轮都会说话，带来噪音。
- 成本数据：该 mod 的 README 估计，在 50k token 会话中每次检查约 5–6k input-equivalent tokens，缓存过期时更多。
- 安全说明：mod 不沙箱、以用户权限运行、能读文件/看 prompt/花用量；内置 mod 在 `--safe-mode` 下仍运行。
- 内置 mod 数量为六个；`You Should Know` 默认关闭。

**局限：**
- 主要是单作者体验和观点，没有系统评测、对照实验或可复现的代码。
- 原文没有给出 mod 的完整创建步骤、API、事件名、示例代码或安装命令，无法直接照做。
- 效果高度依赖个人工作流；噪音和 token 成本可能抵消收益。
- 安全风险明确：第三方 mod 需要读代码，不能当作普通插件随意安装。
- “harness 成为平台”“后台自动发现摩擦并建议 mod”属于作者预判，尚未实现。
- 适用条件：使用 Claude Code、有明确的人机协作摩擦点、能承担权限风险，并愿意持续调触发条件。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式：**
1. 选一个真实的 Claude Code 编码任务，先只开启内置 `You Should Know`，用一周，不写自定义 mod。
2. 每次它提示时记录四项：是否是我本来会漏的；是否改变了我的决策；我能否立即行动；是不是噪音。
3. 如果发现一个反复出现的摩擦点，再让 Claude 写一个最小 mod：只挂一个事件、只显示一条信息、设置明确触发条件，避免每轮都响。
4. 用 `/supervisor off` 或修改触发条件控制噪音；只安装自己写的或官方内置的 mod。
5. 对比试用前后同一类任务的表现。

**判断指标：**
- **有效提示率**：有用提示数 ÷ 总提示数。触发多不等于有用，原文的 99/111 就是反面案例。
- **遗漏发现数**：是否至少一次发现了本来会漏的问题，例如未提交文件被误删的风险。
- **决策效率**：是否减少了你手动检查、来回确认的时间。
- **分心次数**：是否因为提示太多而开始习惯性忽略。
- **成本**：每次检查的 token 消耗，以及缓存过期后的上升幅度。
- **停用/调整频率**：如果一个 mod 经常需要关掉或改触发条件，说明它还没有稳定改善工作方式。

通过标准可以设得很低：至少有一次“本来会漏、被它发现”的记录，或明显减少重复检查；如果多数提示是噪音、成本高于收益，就停用，只保留设计思路。
