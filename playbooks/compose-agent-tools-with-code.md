# 让 agent 用代码沙箱一次跑完多工具批量分析

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当你需要把多个工具调用按顺序或并行组合、跑完一条批量分析链，且中间结果不必进上下文时，如何让 agent 用一句目标自动写代码编排。
> 先试这一步：挑一个只读的信息源，在支持代码执行的 harness 里开一个沙箱，用一句复合目标（如“把近 30 天的工单按用户不满程度分级，列出最需要处理的 10 条”）跑一次批量分析，中间结果存进会话状态。
> 最近修订：2026-10-02

## 解决什么问题
当你需要把多个工具调用按顺序或并行组合起来，跑完一条“拉取—逐条判断—汇总排序”的批量分析链，并且中间结果不必全部塞回上下文时，怎么让 agent 用一句目标自己写代码编排，而不是人逐个工具去点。

## 适用与不适用
适用：
- 多工具按序或并行组合的分析类任务，例如从 issue tracker 拉全部 issue、逐条读评论、对每条做情绪分级、汇总排序。
- 中间结果不必进上下文，可以暂存在会话状态里的任务。
- 判断/分级这类步骤可以交给小模型（示例用 classifier 类型的 Jev），编排交给代码沙箱。

不适用：
- 单个简单工具调用，不需要代码沙箱。
- 写操作不要放进沙箱自动执行，保持人工确认。
- Codemode 位于 harness 侧受信任环境，适合编排，不适合放不可信执行。

## 前置条件
- 一个已有 API 或 MCP 入口的信息源，只给读权限（示例是 Linear）。
- 一个可用于分类的模型（示例是登录了提供 “Jev” 的 provider，用 `typesafe/jev` 做分类）。
- 一个跑在 harness 侧的代码沙箱（Pi 的 codemode 或等价物）。
- 足够的工具元数据，以便把工具标成“延迟加载（deferred）”或“仅 codemode 可用”；否则普通 MCP 扩展在 codemode 下无法决定某个工具该不该暴露给 LLM。
- 工具返回结构化数据，并靠文档和描述被发现。

## 操作步骤
先选做法：
- 手头就是 Pi，且已配置要用的 MCP server → 做法 A。
- 用别的 harness，或要自己搭工具加载逻辑 → 做法 B（没有现成等价代码，需要重写）。

### 做法 A：在 Pi 里用 codemode 跑一次批量分析
1. 前提：使用 Pi，且已配置要用的 MCP server（示例是 Linear）。Codemode 在配置 MCP 时自动加载，也可以作为默认工具写进配置。
   预期：MCP server 可用，codemode 可用。
2. 启用 codemode。原文给的原话是：
```
Just ask pi to reconfigure itself to enable codemode!
```
   也就是让 Pi 自己改配置把 codemode 打开。
   预期：codemode 被启用。
3. 前提：有一个可用于分类的模型。示例是登录了提供 “Jev” 的 provider，用 `typesafe/jev` 做分类。
4. 用一句自然语言下达复合目标，不要逐个工具去点。原文示例提示词：
```
Use typesafe/jev via codemode to find the 20 most frustrated commenters on our issue tracker
```
   预期：agent 会在 codemode 里自己写 JS，把 MCP 工具调用和模型调用组合起来。
5. Agent 会在 codemode 里自己写 JS。原文给出的代码如下（原样）：
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
   预期：跑完拉取、逐条分级、汇总排序，返回聚合结果。
6. 中间结果留在 codemode 的状态里（`store("frustration", results)`），后续追问可以直接读，不必重新抓取 issue。
   预期：追问某一条细节时不需要重新调 list_issues / list_comments。
7. 若涉及写操作，不要放进沙箱自动执行，保持人工确认；沙箱内的工具调用按最小权限配置。

### 做法 B：在别的 harness 上搭等价物
1. 挑一个已有 API 或 MCP 入口的信息源（issue tracker、工单、邮件列表、会议记录），只给读权限。
2. 在支持代码执行的 harness 里开一个沙箱，把该信息源的工具以结构化返回的形式接进去。
3. 用一句复合目标跑一次批量分析，例如：
```
把近 30 天的工单按用户不满程度分级，列出最需要处理的 10 条
```
4. 把中间结果存进会话状态，再追问其中某一条的细节，验证不需要重新抓取。
5. 如果是在给自己搭 harness（工具作者或配置者视角），原文给的两条要求是：工具要返回结构化数据、并靠文档和描述被发现；工具 loadout 要能把工具标成“延迟加载（deferred）”或“仅 codemode 可用”，否则 MCP 扩展体验做不好。
   注意：原文代码里的 `tools.mcp__*`、`models.getModelOfType`、`models.classify`、`store` 都是 Pi 专有 API，换 harness 需要重写。

## 怎么判断变好了
- 完成度：是否一次提示就端到端跑完，不需要人工逐个调工具。
- 上下文与调用次数：与“把所有工具塞进上下文逐个调用”相比，工具描述占用的上下文和往返次数是否下降。
- 准确率：人工抽 20 条复核分级结果，算与人工判断的一致率；低于可接受阈值就换模型或改 criteria 措辞。
- 可追溯性：每条结论能否点回原始条目（原文示例保留了 issue id）。
- 风险控制：写操作不要放进沙箱自动执行，保持人工确认；沙箱内的工具调用按最小权限配置。

最小试用方式：
1. 挑一个已有 API 或 MCP 入口的信息源（issue tracker、工单、邮件列表、会议记录），只给读权限。
2. 在支持代码执行的 harness 里开一个沙箱（Pi 的 codemode 或等价物），把该信息源的工具以结构化返回的形式接进去。
3. 用一句复合目标跑一次批量分析，例如“把近 30 天的工单按用户不满程度分级，列出最需要处理的 10 条”。
4. 把中间结果存进会话状态，再追问其中某一条的细节，验证不需要重新抓取。

试多久：原文没有给试用时长；先跑完一轮批量分析，并做一次人工抽查，再决定是否扩大使用。

## 常见坑
- 只有一次示例结果、无人工对照，不宜直接固化为标准做法；先小范围试。
- 原文代码是 Pi 专有 API，换 harness 需要重写。
- 依赖 Linear MCP 和 Jev 分类模型，换信息源或分类模型需要替换。
- 文中没有给出情绪分级准确率的人工对照，也没有量化省下的 token 或成本。
- 文章落款日期标为 2026-09-29，引用前建议先确认版本与功能是否已发布。
- 普通 MCP 扩展拿不到足够元数据时，在 codemode 下无法决定某个工具该不该暴露给 LLM，所以要先补齐配置能力。
- Codemode 跑在 harness 侧受信任环境，适合编排，不适合放不可信执行。
- 写操作不要放进沙箱自动执行。
- 原文只说中间结果持久化在 codemode 的会话状态里、可以继续深挖；没有讲时间、事件或状态触发的持续运行。

## 证据与来源
- 本手册只依据一篇调研：Pi.dev: You Said No MCP。
- 有实证的部分：一次完整运行，给出了可读的代码、执行日志（331 次调用、若干 ✓ 行）以及聚合数字（167 条 open issue：156 条 neutral、11 条 mild、0 条 high）和被标记的 issue 列表（PI-6907 README 缺安装章节、PI-10031 卡在 “Working...” 、PI-4714 想要 /update 命令、PI-7730 macOS 长会话高 CPU）。属可复核的一手材料。
- 只是主张的部分：MCP“应该更接近带智能工具发现的 OpenAPI”；Codemode 是更好的组合方式；“拥抱一个东西才是影响它的最好方式”。这些是立场，没有对照实验或量化支撑。
- 适用条件与限制：代码里的 `tools.mcp__*`、`models.getModelOfType`、`models.classify`、`store` 都是 Pi 专有 API，换 harness 需要重写；依赖 Linear MCP 和 Jev 分类模型；文中没有给出情绪分级准确率的人工对照，也没有量化省下的 token 或成本；文章落款日期标为 2026-09-29，引用前建议先确认版本与功能是否已发布。

## 依据的调研

- [Pi.dev: You Said No MCP](../research/radar/2026-10-02/103-pi-dev-you-said-no-mcp.md)：值得一试，值得小范围试：在支持代码执行的 harness 里开一个沙箱（Pi 的 codemode 或等价物），接一个 MCP/API 信息源加一个小分类模型，用一句复合目标跑完「拉取—逐条判断—汇总排序」，中间结果存进会话状态；原文给了一句话提示词和完整可读代码，照做门槛低。但它只有一次示例结果、无人工对照，且代码 API 全是 Pi 专有，所以先试，不宜直接固化为标准做法。
