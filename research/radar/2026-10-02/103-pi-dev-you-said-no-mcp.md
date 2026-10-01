# Pi.dev: You Said No MCP

- 结论：**值得一试**。值得小范围试：在支持代码执行的 harness 里开一个沙箱（Pi 的 codemode 或等价物），接一个 MCP/API 信息源加一个小分类模型，用一句复合目标跑完「拉取—逐条判断—汇总排序」，中间结果存进会话状态；原文给了一句话提示词和完整可读代码，照做门槛低。但它只有一次示例结果、无人工对照，且代码 API 全是 Pi 专有，所以先试，不宜直接固化为标准做法。
- 原文：https://earendil.com/posts/you-said-no-mcp/
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T17:28:06.345Z

## 是什么

Pi（pi.dev）此前公开声明「不支持 MCP」，作者也多次在播客里贬低 MCP；现在新版 Pi 把 MCP 放进了核心。文章解释原因：MCP 本身在一年里变了，而且为支持 MCP 所做的改造（解释器沙箱、工具元数据、延迟加载）本身对 Pi 有用，还顺带让 Jev 更好用。

核心概念是 **Codemode**：一个跑在 **harness 侧**（受信任环境）的 JavaScript 沙箱，用途是编排和组合工具调用。它和「在 bash/工具沙箱侧执行工具」是两回事：harness loop 通常运行在受信任环境，而它执行的工具往往跑在不那么受信任的沙箱里。Codemode 跑在 harness 侧，所以状态保存在会话记录（session transcript）里，而不是文件系统。选 JavaScript 是因为小体积的 JS 可以编译成 WASM 二进制，能提供一定程度的隔离。

作者对 MCP 的取向：MCP 应该更接近「带智能工具发现的 OpenAPI」——工具返回结构化数据、可被文档和描述发现，而不是把所有工具倒进上下文、靠返回文本来省 token。在 Pi 里，Codemode 就是把 MCP 工具暴露给 JS 沙箱（原文提到 Codex 等 harness 也这么做）。

## 具体做法

1. 前提：使用 Pi，且已配置要用的 MCP server（示例是 Linear）。Codemode 在配置 MCP 时自动加载，也可以作为默认工具写进配置。
2. 启用 codemode。原文给的原话是：

```
Just ask pi to reconfigure itself to enable codemode!
```

   也就是让 Pi 自己改配置把 codemode 打开。
3. 前提：有一个可用于分类的模型。原文示例是登录了提供 "Jev" 的 provider，用 `typesafe/jev` 做分类。
4. 用一句自然语言下达复合目标，不要逐个工具去点。原文示例提示词：

```
Use typesafe/jev via codemode to find the 20 most frustrated commenters on our issue tracker
```

5. Agent 会在 codemode 里自己写 JS，把 MCP 工具调用和模型调用组合起来。原文给出的代码如下（原样）：

```js
const { issues } = await tools.mcp__linear__list_issues({
  team: "Pi", state: "open", limit: 250,
});
const jev = await models.getModelOfType(
  "classifier", "cloudflare-workers-ai", "typesafe/jev",
);
const questions = {
  frustration: {
    type: "choice",
    instructions: "Judge ONLY the emotional tone of the people writing. " +
      "Ignore how severe the bug is.",
    criteria: {
      none: "Neutral, factual, or friendly, even about a serious bug",
      mild: "Explicit annoyance, impatience, or disappointment",
      high: "Clearly angry, exasperated, sarcastic, or fed up",
    },
  },
};

const results = [];
let next = 0;
async function worker() {
  while (next < issues.length) {
    const issue = issues[next++];
    const { comments } = await tools.mcp__linear__list_comments({
      issueId: issue.identifier,
    });
    const c = await models.classify(jev, { state: { ...issue, comments }, questions });
    results.push({ id: issue.identifier, title: issue.title, ...c.answers.frustration });
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
store("frustration", results);

const score = (r) => r.probabilities.mild * 0.5 + r.probabilities.high;
const counts = {};
for (const r of results) counts[r.choice] = (counts[r.choice] ?? 0) + 1;
const flagged = results.filter((r) => r.choice !== "none");
flagged.sort((a, b) => score(b) - score(a));
return {
  total: results.length,
  counts,
  flagged: flagged.map((r) => `${r.id} ${r.title}`),
};
```

6. 中间结果留在 codemode 的状态里（`store("frustration", results)`），后续追问可以直接读，不必重新抓取 issue。
7. 如果是在给自己搭 harness（工具作者或配置者视角），原文给的两条要求是：工具要返回结构化数据、并靠文档和描述被发现；Pi 的工具 loadout 要能把工具标成「延迟加载（deferred）」或「仅 codemode 可用」，否则 MCP 扩展体验做不好。

## 对应的研究问题

- **能力发现**：可交给 AI 的是整条复合分析链——拉取全部 issue、逐条读评论、对每条做情绪分级、汇总排序。人只写一句目标，具体编排由 agent 现写 JS 完成。原文示例一次处理 167 条 issue。
- **任务匹配**：适合「多工具按序或并行组合、且中间结果不必进上下文」的分析类任务；单个简单工具调用不需要 codemode。分类分级这类判断适合交给小模型（示例用的是 classifier 类型的 Jev），编排交给 JS 沙箱。Codemode 位于 harness 侧受信任环境，适合编排，不适合放不可信执行。
- **条件供给**：需要（a）MCP server（示例是 Linear），（b）一个分类模型（示例是 typesafe/jev），（c）codemode 沙箱，（d）足够的工具元数据以把工具标为延迟加载或 codemode 专属，（e）工具返回结构化数据。原文明确指出，普通 MCP 扩展拿不到足够元数据时，在 codemode 下无法决定某个工具该不该暴露给 LLM，所以要先补齐配置能力。
- **主动推进**：原文只说中间结果持久化在 codemode 的会话状态里、可以继续深挖；**没有**讲时间、事件或状态触发的持续运行。
- **效果验证**：原文给了一次可复核的运行结果——167 条 open issue，156 条 neutral、11 条 mild、0 条 high，并列出最明显的若干条（PI-6907 README 缺安装章节、PI-10031 卡在 "Working..."、PI-4714 想要 /update 命令、PI-7730 macOS 长会话高 CPU）。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

- 有实证的部分：一次完整运行，给出了可读的代码、执行日志（331 次调用、若干 ✓ 行）以及聚合数字（167 / 156 / 11 / 0）和被标记的 issue 列表，属可复核的一手材料。
- 只是主张的部分：MCP「应该更接近带智能工具发现的 OpenAPI」；Codemode 是更好的组合方式；「拥抱一个东西才是影响它的最好方式」。这些是立场，没有对照实验或量化支撑。
- 适用条件与限制：代码里的 `tools.mcp__*`、`models.getModelOfType`、`models.classify`、`store` 都是 Pi 专有 API，换 harness 需要重写；依赖 Linear MCP 和 Jev 分类模型；文中没有给出情绪分级准确率的人工对照，也没有量化省下的 token 或成本；文章落款日期标为 2026-09-29，引用前建议先确认版本与功能是否已发布。

## 怎么试、怎么验证

最小试用方式：

1. 挑一个已有 API 或 MCP 入口的信息源（issue tracker、工单、邮件列表、会议记录），只给读权限。
2. 在支持代码执行的 harness 里开一个沙箱（Pi 的 codemode 或等价物），把该信息源的工具以结构化返回的形式接进去。
3. 用一句复合目标跑一次批量分析，例如「把近 30 天的工单按用户不满程度分级，列出最需要处理的 10 条」。
4. 把中间结果存进会话状态，再追问其中某一条的细节，验证不需要重新抓取。

判断有没有改善的指标：

- 完成度：是否一次提示就端到端跑完，不需要人工逐个调工具。
- 上下文与调用次数：与「把所有工具塞进上下文逐个调用」相比，工具描述占用的上下文和往返次数是否下降。
- 准确率：人工抽 20 条复核分级结果，算与人工判断的一致率；低于可接受阈值就换模型或改 criteria 措辞。
- 可追溯性：每条结论能否点回原始条目（原文示例保留了 issue id）。
- 风险控制：写操作不要放进沙箱自动执行，保持人工确认；沙箱内的工具调用按最小权限配置。
