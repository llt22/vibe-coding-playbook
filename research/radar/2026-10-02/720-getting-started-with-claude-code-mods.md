# Getting started with Claude Code mods

- 结论：**值得一试**。可以照原文从零搭一个约 80 行的 Claude Code mod（Token Weather），在本机小范围试，验证它能否把上下文占用、危险命令拦截、改动回放这类信息嵌进会话；给 try 而不是 adopt，是因为教程本身完整可照做，但 mods API 会随版本变化，且 mod 以与 Claude Code 同等权限在本机运行，需要先确认信任来源。
- 原文：https://claude.dev/blog/getting-started-with-claude-code-mods/
- 来源：rss:claude.dev，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T23:27:27.943Z

## 是什么

Claude Code 的 mod 本质是 hook：它以插件形式分发，行为写在一个 JavaScript/TypeScript 模块里，模块运行在会话内，能看到发生的每个事件。相比 settings 里的 hook（每个事件跑一个 shell 命令、用 stdin/stdout 传 JSON），mod 只加载一次并常驻会话，可以持有状态、画随事件更新的 UI，并回调 Claude Code：开面板、跑进程、注册 slash command、注册模型可调用的工具。

一个 mod 可以做三种事：观察（`await next(e)` 后看结果）、改写（`return next({ ...e, command: safer })`）、回答（不调 next 直接 `return { deny: "…" }`，或自己提供命令/工具）。

版本要求：Claude Code 2.1.287 或更高，mods 默认开启，无需打开开关。每次加载 mod，Claude Code 会把类型声明写进该 mod 的 `.claude-plugin/types/` 文件夹，那份声明是你这个版本的权威依据。Claude Code 自身也有功能是 mod 实现的（如 AGENTS.md 支持、对话旁的 `/diff` 面板），源码在 public 的 `anthropics/claude-code` 仓库 `mods/` 下。

## 具体做法

### 步骤 0：确认版本（前提）

```shell
claude --version   # 需要 2.1.287 或更高
```

### 步骤 1（可选，最快）：让 Claude 自己写这个 mod

开一个 session，粘贴下面这段提示词（原文中的"shortcut"）。它只描述你想要看到什么，不需要懂 API：

```text
Make me a Claude Code mod called token-weather: a live forecast of my context window, shown in the band above the prompt.

What it should show, on one line:
- A weather icon and word for how full the context window is: under 25% ☀ Clear (yellow), 25–49% ☁ Cloudy (cyan), 50–74% ☂ Showers (blue), 75–89% ☇ Storm (magenta), 90% and up ↯ Compact soon (red).
- The percentage used, then the tokens used out of the window, like "134.4k / 200k".
- A small chart of the last 12 turns, drawn with ▁▂▃▄▅▆▇█.
- How much the last turn added, like "▲ +98.3k last turn".

It should update after every turn.
```

前提/注意：Claude 会问一次是否为本次会话打开 hot reloading，允许它，band 就会在 Claude 回合结束时出现在 prompt 上方；之后每次改动原地重载，可以继续提要求（"make Storm start at 70%"、"add the dollar cost at the end"）看效果。这个 mod 只在当前会话加载，目录之后会被清理，要保留就把文件夹复制出去，按步骤 7 当普通插件安装。

### 步骤 2：手工建目录（想自己看懂/检查 Claude 写了什么时走这条）

```text
token-weather/
├── .claude-plugin/
│   ├── plugin.json
│   └── types/ (written by Claude Code when it loads the mod)
├── hooks/
│   ├── hooks.json
│   └── token-weather.mjs
├── types/
│   └── index.d.ts (added in step 3)
└── tests/
    └── token-weather.test.ts (added in step 5)
```

`.claude-plugin/plugin.json`（标准插件 manifest）：

```json
{
  "name": "token-weather",
  "version": "0.1.0",
  "description": "A live forecast of the context window, drawn above the prompt.",
  "author": { "name": "You" }
}
```

`hooks/hooks.json` 指向模块，一个 mod 只能有一个：

```json
{
  "modules": ["./token-weather.mjs"]
}
```

### 步骤 3：先画点东西

prompt 正上方那条带叫 `AbovePrompt`，Claude Code 自己不在那儿画东西，适合当第一个目标。

```javascript
// hooks/token-weather.mjs
export function register(on) {
  on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e);
    return Box({
      paddingX: 1,
      children: [Text({ color: "yellow", bold: true, children: "☀ Clear skies" })],
    });
  });
}
```

前提：元素不是全局变量，`$.ui.resolve(e)` 返回当前正在绘制的 surface 对应的构造函数（每个 surface 支持的元素集略有不同）；也可以用 JSX，工厂函数是 `h`。

带插件启动会话：

```shell
claude --plugin-dir ./token-weather
```

保持会话开着——文件夹被监视，每次保存原地重载模块，无需重启。

### 步骤 4：读真实数字，把历史放进 `$.state`

`$.session.usage()` 返回与状态行相同的数字：`context.tokens` 是上一条回答所基于的输入，`context.window` 是模型的窗口，`context.percent` 是两者之比。这个调用是免费的，只有你要 breakdown 时才会发一次 token 计数请求。

```javascript
on("session.start", async ($, e, next) => {
  const result = await next(e);
  await takeReading($);
  return result;
});

on("turn.complete", async ($, e, next) => {
  const result = await next(e);
  if (!e.agentId) {
    await takeReading($); // main-loop turns only, not subagents
  }
  return result;
});
```

关键坑：模块级变量（如 `let readings = []`）在 hot reload 时会重置，因为 reload 是一次全新加载，`register` 会重跑、`session.start` 会再次触发。历史必须放 `$.state`，它由宿主持有，整个会话存活、跨重载保留。

```javascript
// Held by the host, so the history survives a hot reload of this file.
const readings = { plugin: "token-weather", key: "readings" };

async function takeReading($) {
  const { context } = await $.session.usage();
  if (!context?.window) return;
  const tokens = context.tokens ?? 0;
  const percent = context.percent ?? Math.round((tokens / context.window) * 100);
  const { value: history = [] } = await $.state.get(readings);
  await $.state.set(readings, [...history, { tokens, window: context.window, percent }].slice(-HISTORY));
}
```

state 必须在插件的类型契约里声明。新建 `types/index.d.ts`：

```typescript
export type TokenWeatherReading = { tokens: number; window: number; percent: number };

declare module "claude-code" {
  interface PluginState {
    "token-weather": { readings: TokenWeatherReading[] };
  }
}
```

前提：把 `"types": "./types/index.d.ts"` 加进 `plugin.json`。跳过这步，`claude plugin validate` 会报错并给出修法：`token-weather.readings is not declared: the manifest's types contract must name it in interface PluginState { … }`。

回报：重绘是自动的——渲染 hook 执行期间发生的 `$.state.get` 会订阅那次绘制，之后每次 `$.state.set` 都会重画这条带，永远不用调 `$.ui.invalidate`。

### 步骤 5：完整模块（原文 Step 4，可整段复制）

```javascript
// Token Weather: a live forecast of the context window, above the prompt.

const HISTORY = 12;
const BARS = "▁▂▃▄▅▆▇█";
const FORECAST = [
  { upTo: 25, icon: "☀", word: "Clear", color: "yellow" },
  { upTo: 50, icon: "☁", word: "Cloudy", color: "cyan" },
  { upTo: 75, icon: "☂", word: "Showers", color: "blue" },
  { upTo: 90, icon: "☇", word: "Storm", color: "magenta" },
  { upTo: Infinity, icon: "↯", word: "Compact soon", color: "red" },
];

// Held by the host, so the history survives a hot reload of this file.
const readings = { plugin: "token-weather", key: "readings" };

export function register(on) {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    await takeReading($);
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (!e.agentId) {
      await takeReading($); // main-loop turns only, not subagents
    }
    return result;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const { value: history = [] } = await $.state.get(readings);
    if (e.props.hasSurvey || history.length === 0) {
      return next(e);
    }
    const { Box, Text } = $.ui.resolve(e);
    return band(Box, Text, history, e.props.bodyColumns);
  });
}

async function takeReading($) {
  const { context } = await $.session.usage();
  if (!context?.window) return;
  const tokens = context.tokens ?? 0;
  const percent = context.percent ?? Math.round((tokens / context.window) * 100);
  const { value: history = [] } = await $.state.get(readings);
  await $.state.set(readings, [...history, { tokens, window: context.window, percent }].slice(-HISTORY));
}

function band(Box, Text, history, columns) {
  const now = history[history.length - 1];
  const f = FORECAST.find((b) => now.percent < b.upTo);
  const parts = [
    Text({ color: f.color, bold: true, children: `${f.icon} ${f.word}` }),
    Text({ children: ` ${now.percent}% of context` }),
    Text({ dimColor: true, children: ` ${short(now.tokens)} / ${short(now.window)}` }),
  ];
  if (columns >= 60) {
    parts.push(Text({ dimColor: true, children: " last turns " }));
    parts.push(Text({ color: f.color, children: sparkline(history) }));
    if (history.length > 1) {
      parts.push(Text({ dimColor: true, children: trend(history) }));
    }
  }
  return Box({ flexDirection: "row", paddingX: 1, children: parts });
}

function sparkline(history) {
  const top = Math.max(...history.map((r) => r.tokens), 1);
  return history.map((r) => BARS[Math.floor((r.tokens / top) * (BARS.length - 1))]).join("");
}

function trend(history) {
  const delta = history[history.length - 1].tokens - history[history.length - 2].tokens;
  if (delta === 0) return " steady";
  return delta > 0 ? ` ▲ +${short(delta)} last turn` : ` ▼ ${short(-delta)} last turn`;
}

function short(n) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}
```

原文点名三个值得抄进自己 mod 的细节：

1. 组件 props 在 `e.props` 上。`hasSurvey` 表示有问卷想占用这条带，此时用 `next(e)` 让位；`bodyColumns` 是这条带的真实宽度（旁边 dock 了面板时比终端窄），按它来排版。只有 `e.component`、`e.surface`、`e.requestId`、`e.viewport` 在 `e` 顶层。
2. 没东西可画就放行：返回 `next(e)`，把这条带交还给 Claude Code 和其他 mod。
3. 用单宽符号，不要用 emoji：`☀ ☁ ☂ ☇ ↯` 在任何终端字体里都能对齐。

保存文件，运行中的会话会直接接住。读几次大文件后，band 会从 Clear 走到 Showers 再到 Storm。

### 步骤 6：校验和测试

```text
$ claude plugin validate ./token-weather
> types ./types/index.d.ts declares state: token-weather.readings
> ./token-weather.mjs hooks: session.start, turn.complete, ui.render{component=AbovePrompt}
> ./token-weather.mjs calls: $.session.usage (via takeReading), $.state.get, $.state.set (via takeReading), $.ui.resolve
> ./token-weather.mjs state writes: token-weather.readings
> ./token-weather.mjs state reads: token-weather.readings
√ Validation passed
```

`claude plugin test` 会对真实 Claude Code 运行时执行插件的 `*.test.ts`。测试里用 `on` 注册的 hook 排在 mod 之后运行，并桩掉 Claude Code 本该给出的回答，所以你能精确控制 `$.session.usage()` 返回什么：

```typescript
// tests/token-weather.test.ts
import { describe, expect, test } from "claude-code/testing";

describe("token-weather", () => {
  test("the band follows the context window", async ($, on) => {
    // Hooks registered here run after the mod and stub what Claude Code would answer.
    let tokens = 36_100;
    on("session.start", ($, e) => ({ cwd: e.cwd }));
    on("session.usage", () => ({
      value: { startedAt: 0, rateLimits: [], context: { tokens, window: 200_000, percent: Math.round(tokens / 2_000) } },
    }));
    on("turn.complete", () => ({ text: "" }));

    await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
    const ui = await $.ui.mount({
      plugin: "token-weather",
      surface: "terminal",
      component: "AbovePrompt",
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as any);
    expect(await ui.find({ type: "Text", text: /Clear/ })).toBeDefined();

    tokens = 134_400;
    await $.turn.complete({ reason: "answer", answer: "ok", durationMs: 1 } as any);
    expect(await ui.find({ type: "Text", text: /Showers/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /67% of context/ })).toBeDefined();
    expect(await ui.find({ type: "Text", text: /▲ \+98\.3k last turn/ })).toBeDefined();
    await ui.unmount();
  });
});
```

```text
$ claude plugin test ./token-weather
(pass) token-weather > the band follows the context window
 1 pass
 0 fail
```

这个测试同时验证了步骤 4 的自动重绘：`turn.complete` 之后 band 自己更新了，mod 从未主动请求重绘。

### 步骤 7：分享与安装

mod 就是插件，分发方式一样。marketplace 可以只是一个带 `.claude-plugin/marketplace.json` 的文件夹：

```json
{
  "name": "my-mods",
  "owner": { "name": "You" },
  "plugins": [{ "name": "token-weather", "source": "./token-weather" }]
}
```

```shell
claude plugin marketplace add ./my-mods
claude plugin install token-weather@my-mods --scope user
```

把它放进带 marketplace 文件的 GitHub 仓库，这个仓库就是你的 marketplace，别人可以直接装、你正常 push 就能更新。安装方三条命令：

```text
/plugin marketplace add your-org/my-mods
/plugin install token-weather@my-mods
/reload-plugins
```

mod 在 reload 时启动；没出现就重启 Claude Code。安全前提（原文明确写了）：mod 是在你机器上、以 Claude Code 同等权限运行的代码，作者是发布者而不是 Anthropic，所以按装包的规矩来——先读仓库，只装你信任的人写的东西，没敲命令之前不会装上任何东西。Claude 目录也接受带 mod 的插件，可在 claude.ai/directory/manage 提交。

### 步骤 8：两个进阶 mod 里可复用的技法

**Blast Radius（危险命令执行前先给出影响面）**：命中 `rm -rf`、`git reset --hard`、`git clean`、force push、数据库 migration 时拦住调用，算出它会碰什么，开一个带 Proceed / Cancel 的面板；按 2 则 Claude 收到带原因的拒绝，按 1 则原样执行。它用了三个 hook：`tool.call`（matcher 为 Bash），以及 `ui.render` 上的 `Pane` 和 `AbovePrompt`。核心是"回答"这一招：

```javascript
on("tool.call", { tool: "Bash" }, async ($, e, next) => {
  const risk = classify(String(e.command ?? ""));
  if (risk === null) return next(e); // everything else runs as normal

  const report = await measure($, risk, await $.session.cwd()); // git status, git clean -n, du, ...
  held = { command: e.command, risk, report, decision: null };
  const opened = await $.ui.open({ id: "blast-radius", title: "Blast Radius", focus: true });
  if (!opened.isPlaced) held.where = "band"; // too narrow for a pane: draw above the prompt

  while (held.decision === null && !next.signal.aborted) {
    await $.process.run(["sleep", "0.25"]); // time inside $ calls doesn't count against the hook's time limit
  }
  if (held.decision === "proceed") return next(e); // let it run
  return { deny: `Blast Radius held this command: the user pressed Cancel. It would have: ${report.summary}.` };
});
```

它教的东西：用 `$.process.run` 做 dry run——报告来自工具自己的命令（`git status --porcelain`、`git clean -n`、`git log HEAD..origin/main`、`showmigrations`），参数以 argv 数组传入，路径里的东西不会被当 shell 代码执行；挂住一次调用——hook 每次派发只有 10 秒自己的时间，但在 `$` 调用内部等待的时间不计入，所以用短 sleep 轮询直到按钮的 `onPress` 写入决定，`next.signal` abort（你按了 Esc）就放弃；带热键的按钮——`Button({ label: "Proceed", hotkey: "1", onPress })` 支持点击、Tab+Enter、或直接按数字；降级到 band——终端够宽时 dock 在对话旁，`$.ui.open` 返回 `isPlaced: false` 时把同一份报告画在 prompt 上方。原文强调：它是安全网，不是权限系统——它读命令文本，`$(…)`、alias、脚本里调 rm 都能绕过，硬拦要用 permission rules。

**Replay Theater（逐步回放上一轮的改动）**：一轮运行期间记录每次 Edit 和 Write（文件 + 前后文本）；回合结束时 prompt 上方出现提示，按 `r` 或输入 `/replay` 打开面板，一条 diff 一条 diff 地走，带编号步骤条和 Prev / Next / Close。它从不阻塞、也不改任何编辑：

```javascript
on("tool.call", async ($, e, next) => {
  if (EDIT_TOOLS.has(e.tool)) state.pending.push(...(await stepsFor($, e))); // old/new text → diff
  return next(e); // the edit runs untouched
});

on("turn.start", ($, e, next) => { if (!e.agentId) state.pending = []; return next(e); });

on("turn.complete", async ($, e, next) => {
  const r = await next(e);
  if (!e.agentId && state.pending.length) state.replay = state.pending; // one replay per turn
  return r;
});

on("session.start", async ($, e, next) => {
  const r = await next(e);
  await $.command.register({ name: "replay", description: "Step through the last turn's file edits" });
  return r;
});
on("command.run", { command: "replay" }, async ($, e) => ({ text: (await openReplay($)) ? "Replaying" : "No edits" }));
```

它教的东西：配对事件——`turn.start` 和 `turn.complete` 把编辑夹成"每轮一次回放"，`e.agentId` 把 subagent 的回合排除在分组外；注册 slash command——在 `session.start` 里 `$.command.register`，在 `command.run` 上应答；读文件——对 Write，在写入落盘前用 `$.fs.read` 拿旧内容，diff 才是真的；摆放位置是 surface 的事——全屏时 dock 在右侧，80 列时内联在 prompt 上方，mod 两种情况画同一棵树。

### 步骤 9：原文建议保留的四个习惯

1. 依赖 Claude Code 给你写的类型：每次加载 mod 都会把声明写进 `.claude-plugin/types/`，编辑器和 `tsc -p` 不用额外步骤，它是每个事件、`$` 上每个方法、每个元素 props 的参考。
2. props 从 `e.props` 读（`hasSurvey`、`bodyColumns` 等在那里，不在 `e` 上）。
3. 为 hot reload 做打算：每次保存都会重跑 `register` 和 `session.start`，数据放 `$.state`，不要放模块变量。
4. 画的东西不显示时看日志：`claude --debug`，找提示某个 hook 返回的树没通过校验的那行。

原文还给了几个起步点子：用 `$.session.usage()` 做成本/速率表并放到状态行（`$.ui.status`）；`prompt.submit` hook 给每个 prompt 加上团队约定；一个列出本次会话 Claude 读过哪些文件的 pane；长回合结束时用 `$.ui.toast` 发提醒的专注计时器；针对自己技术栈的 `tool.call` 守卫（生产 kubectl context、`terraform apply`）。

## 对应的研究问题

**1. 能力发现（AI 还能做哪些没想到交给它的工作）**
- 把"上下文窗口还剩多少"变成 prompt 上方一行实时天气预报，并在将满时提示 Compact soon。
- 在危险命令真正执行前把它挂住，算出影响面（列出将删除的文件数和体积）并给出 Proceed/Cancel。
- 把一轮里的所有文件改动记下来，事后逐步回放 diff。
- mod 还能注册 slash command、注册模型可调用的工具、开面板、发 toast、写状态行——即把"会话自身的可观测性与护栏"当成可编程对象。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- 三类动作对应三类任务：只记录用 observe；改变后续链看到的内容用 rewrite；拒绝或自己提供服务用 answer（不调 next）。
- 写 mod 本身可以交给 Claude Code：提示词只描述"我想看到什么"，不需要懂 API；内置的写 mod 指南负责"怎么做"（状态放哪、`claude plugin validate`、该挂哪些事件）。
- settings hook 与 mod 的分工：每个事件跑一次性 shell 命令用 settings hook；要常驻状态、动态 UI、回调进 Claude Code 就用 mod。
- 渲染要按真实宽度适配：`e.props.bodyColumns` 小于阈值就不画图表，面板放不下就降级到 band。
- 终端符号用单宽字符而非 emoji。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 版本前提：Claude Code ≥ 2.1.287。
- 目录与清单前提：`.claude-plugin/plugin.json`、`hooks/hooks.json`（只能一个 module）、模块导出 `register(on, options)`。
- 状态契约前提：state 必须在 manifest 指向的 `.d.ts` 的 `interface PluginState` 里声明，否则 validate 直接失败并给出修法。
- 跨重载持久化前提：历史放 `$.state`，不能放模块变量。
- 测试前提：用 `on` 注册桩来规定 `$.session.usage()` 等返回值，用 `$.ui.mount` 的 props 控制 `bodyColumns`/`hasSurvey`。
- 权限与信任前提：mod 以 Claude Code 同等权限运行、由发布者而非 Anthropic 编写；没敲安装命令不会装上；只从读过的、信任的仓库安装。硬性拦截要靠 permission rules，而不是靠读命令文本的 mod。
- 调试反馈：`claude --debug` 查渲染树校验失败；`claude plugin validate` 查 hooks/calls/state 读写。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- 可用的事件：`session.start`/`session.end`、`turn.start`/`turn.complete`、`tool.call`、prompt 提交、slash command（`command.run`）、`ui.render` 的每个绘制面。
- 用 `e.agentId` 过滤掉 subagent 回合，只对主循环计时/记录。
- 时限与绕过：hook 每次派发只有 10 秒自身时间，但 `$` 调用内部等待不计时——Blast Radius 用 `sleep 0.25` 轮询等用户按钮，`next.signal` abort 时放弃。
- 状态驱动：`$.state` 由宿主持有，跨热重载和整个会话存活，`$.state.set` 会自动触发订阅过它的渲染重绘。
- 一轮之内自动分组的模式：`turn.start` 清空 pending、`tool.call` 累积、`turn.complete` 落成一次可回放。

**5. 效果验证**
- 静态检查：`claude plugin validate ./token-weather` 输出声明的 state、hook 的事件（含 matcher）、调用的 `$` 方法、state 读写，最后 `√ Validation passed`。
- 对真实运行时的测试：`claude plugin test ./token-weather` 跑 `*.test.ts`，可以断言 UI 文本（`/Clear/` → `/Showers/` → `/67% of context/` → `/▲ +98.3k last turn/`），样例输出 `1 pass 0 fail`；测试同时验证了"`turn.complete` 后自动重绘、mod 未主动请求重绘"。
- 交互中验证：热重载反馈环（保存即生效）；跑几轮读大文件的回合，看 band 从 Clear 变 Showers 再变 Storm；对 `rm -rf build` 看是否先出 pane/band 及 Cancel 是否真的返回 deny。
- 失败排查：`claude --debug` 找"hook 返回的树没通过校验"的行。

## 与已有做法的关系

清单中相关条目：**Claude Code（tool，adopt）**、**Claude Code Mods（tool，study）**。

- 本条正是把 "Claude Code Mods" 从 study 推进到可照做层：给出从空文件夹到可发布插件的六步流程、完整 80 行模块、validate/test 命令与预期输出、以及安装/分享命令。
- 对已 adopt 的 "Claude Code"：mod 是它的扩展点（在 settings、permission rules、slash commands、skills、status line 之外又多一层），不改动、不替代既有用法；原文明确说"Claude Code 自身的部分功能就是 mod 实现的"（AGENTS.md 支持、`/diff` 面板），可作为读官方 `mods/` 源码学习的入口。
- 与其他扩展方式的分界（原文给出）：settings hook 每个事件起一个 shell 命令、走 stdin/stdout JSON；mod 一次加载常驻、可持状态、可画动态 UI、可回调注册命令与工具。

清单中没有与本条重复的条目。

## 证据与局限

原文是**教程**，不是效果测评。给出的可核验材料：完整可复制代码（模块、manifest、hooks.json、类型契约、marketplace.json）；`claude plugin validate` 的真实输出；`claude plugin test` 输出 `1 pass 0 fail` 及测试源码。

演示性数字与案例（作者展示，非对照实验）：三回合里上下文占用 18% → 67% → 81%（200k 窗口）；Blast Radius 对 `rm -rf build` 列出 9 个文件（1.1 MB）并支持 Cancel 拒绝、第二次 Proceed 执行；120 列时 Blast Radius 的报告降级画在 band 上；Replay Theater 在 5 处编辑/3 个文件上的提示与 5 步面板；80 列时内联绘制。这些只能说明"能做出来、长这样"，不能说明它改善了工作结果。

属于作者主张的部分：mod 比 settings hook 更强、能持状态画 UI；"热重载反馈环是写 mod 最有意思的地方"；对 mod 的推荐类判断。

明确的适用条件与风险：
- 需要 Claude Code 2.1.287 或更高；mods 默认开启。
- **API 会随版本变化**，以每次加载时写入 `.claude-plugin/types/` 的声明为准。
- Blast Radius 只是安全网：读命令文本，`$(…)`、alias、脚本里的 `rm` 都能绕过，硬性阻止要用 permission rules。
- mod 是在你机器上以 Claude Code 同等权限运行的第三方代码，需先读仓库、只装信任来源。
- 热重载会重跑 `register` 和 `session.start`，模块变量会被重置（这是原文点名的坑）。
- 渲染元素不是全局的，必须经 `$.ui.resolve(e)` 获取；不同 surface 支持的元素集略有不同。
- 符号需用单宽字符，避免终端对齐问题。

## 怎么试、怎么验证

**最小试用（两条路径，选一条即可）**

路径 A（最快，约几分钟）：开一个 `claude` 会话，粘贴步骤 1 的提示词；当它问是否开启 hot reloading 时选择允许；等它写完，确认 prompt 上方出现 band。之后继续提"make Storm start at 70%"这类改动，看是否原地重载生效。要留下来，就把生成的文件夹复制出去，按步骤 7 当插件安装。

路径 B（可复现）：按步骤 2 建目录与两个 JSON，把步骤 3 的 6 行模块存成 `hooks/token-weather.mjs`，`claude --plugin-dir ./token-weather` 起会话，看到 "☀ Clear skies" 后按步骤 4/5 补全，最后跑：

```shell
claude plugin validate ./token-weather
claude plugin test ./token-weather
```

**判断有没有改善的指标**

- 机制是否成立（硬指标）：`claude plugin validate` 输出 `√ Validation passed`；`claude plugin test` 输出 `1 pass 0 fail`；band 在三轮读大文件后确实从 Clear 走到 Showers/Storm；对 `rm -rf build` 先弹出 pane 或 band 且按 Cancel 后工具收到 `deny`。
- 工作是否改善（用你自己的会话对比）：是否比之前更早意识到上下文将满、从而在 Compact 之前主动收尾或开新会话；危险命令被拦下/复核的次数（按 Blast Radius 拦到的次数统计）；一轮多处编辑的 diff 复核时间是否缩短；成本或速率超标是否更早被发现（可用 `$.session.usage()` 做状态行做进一步试验）。
- 若上述任一硬指标不成立，先按四条习惯排查（props 是否从 `e.props` 读、状态是否放 `$.state`、`claude --debug` 里是否有渲染树校验失败），不要直接判定思路无效。
