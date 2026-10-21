# Umair/stalemap

- 结论：**值得一试**。在 JS/TS 项目里小范围试用：先 `npx stalemap` 预览、再 `npx stalemap sync` 把变更笔记写进 AGENTS.md/CLAUDE.md，CI 加 `npx stalemap check`，Claude Code 侧装插件拿到 SessionStart 注入和编辑后 guard。理由是原文给出了可直接复制的安装、配置、CI 与 MCP 步骤，并有预注册盲测数据（89% vs 无辅助 68% vs 普通 tsc 钩子 73%）；但仅支持 JS/TS 与单个 package.json、只测了两个 Claude 模型且为作者自测，所以先试不直接 adopt。
- 原文：https://github.com/Umair/stalemap
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T11:06:23.482Z

## 是什么

stalemap 是一个 npm CLI + MCP server + Claude Code 插件，用来解决「编码 agent 的训练截止日期之后依赖库改了 API，agent 仍按旧 API 写代码」的问题（README 举例：对 AI SDK 7 写 `maxSteps`、对 zod 4 写 `required_error`、对 Next 16 写 `middleware.ts`）。

做法是：算出每个直接依赖在「模型训练截止日之前至少 30 天发布的最后一个稳定版」与「项目实际 pin 的版本」之间的差异，把差异压缩成一份带排序的短笔记，通过三条通道交给 agent：

- 会话开始时的笔记注入（写进 `AGENTS.md` 或 `CLAUDE.md`，或由插件注入上下文）；
- 每次编辑后运行的 guard（跑项目自己的 `tsc`，把编译错误与对应变更条目一起回给 agent）；
- `search_changes` MCP 工具，agent 用自己的话检索（如 “resolve alias in next.config”）。

只支持 JavaScript / TypeScript 项目；声明可配 Claude Code、Cursor、Codex、OpenCode 或任意 MCP client。

## 具体做法

以下命令、配置均照抄原文。前提：Node 项目；有 lockfile 或 `node_modules` 以确定 pin 的版本；能访问 npm registry 与 GitHub（读 changelog/releases）。

**1. 先预览，不动文件**

```bash
npx stalemap            # preview what changed and the block it would write
```

前提：知道当前会话用的模型（用于取训练截止日）。可用 `--model` 指定，或依赖 Claude Code / Codex / OpenCode / Gemini CLI 的配置、`$ANTHROPIC_MODEL`；截止日来自 models.dev（含内置兜底表），也可显式传 `--cutoff YYYY-MM-DD`。

**2. 写入笔记块**

```bash
npx stalemap sync       # write the block into AGENTS.md or CLAUDE.md
```

笔记块位于 `<!-- stalemap:start -->` 与 `<!-- stalemap:end -->` 之间，块外文字不会被改动。Claude Code 读 `CLAUDE.md`；若笔记写在 `AGENTS.md`，需在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md` 指定目标。

**3. CI 守门**

```bash
npx stalemap check      # for CI: exit 1 when the block is missing or stale
```

**4. 手动跑 guard**

```bash
npx stalemap guard src/**/*.ts   # run the guard by hand
```

**5. Claude Code 插件（拿到自动注入 + 编辑后 guard）**

```text
/plugin marketplace add Umair/stalemap
/plugin install stalemap@stalemap
```

插件安装后提供：SessionStart hook（启动时、`/clear` 后、compaction 后把笔记放进上下文，不写文件）、PostToolUse hook（每次 Write/Edit 后跑 guard）、stalemap MCP server 和两个 skill（`/stalemap:sync` 写笔记块；`upgrade` 让 Claude 在使用或升级某包前先查它的变更）。hook 与 MCP server 走 `npx -y stalemap@latest`，因此始终用最新 npm 版本。

**6. 其他 agent 一键配置**

```bash
stalemap setup --agent cursor             # or codex, opencode, claude
stalemap setup --agent codex --dry-run    # print the changes, write nothing
```

该命令为每个 agent 写笔记、注册 MCP server、把 guard 装成 post-edit hook，产出可提交的项目文件；合并进已有配置、保留非它写入的条目、重复执行不变更。**原文明确提示：尚未在真实 Cursor / Codex / OpenCode 安装中验证过**；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，所以 setup 额外加了一个 stop-hook 兜底，把未上报的发现作为后续消息发出。

**7. 任意 MCP client**

```json
{ "mcpServers": { "stalemap": { "command": "npx", "args": ["-y", "stalemap@latest", "mcp"] } } }
```

**8. GitHub Action**

```yaml
- uses: Umair/stalemap@main
  with:
    model: claude-opus-5-5          # fail CI when the notes are missing or stale
    # mode: comment                 # or comment on PRs that change dependencies
```

comment 模式需要 `permissions: pull-requests: write`，会列出每个变更依赖（模型已知的版本 → 实际 pin 的版本）及其笔记，并在后续 push 时更新同一条评论。

**9. 用参数控制成本与覆盖面（按需）**

- `--all`：检查全部直接依赖（默认只查代码 import 的 + 配置文件配置的，如 `tsconfig.json`、`next.config.*`、Prisma schema、Vitest/ESLint 配置）；
- `--margin`：截止日前多少天视为「模型已知」的版本（默认 30 天）；
- `--budget`：笔记默认 1800 tokens，超出时优先保留项目实际用到的部分（导入的 API、成员与 props、设置的配置键、文件名）；
- `--guides`：把升级指南也变成笔记（针对从不体现在类型签名里的变更，如新默认值、改名后的文件约定），只有引用了指南原文的笔记才保留；
- `--examples`：在置顶笔记下加 Before → After 示例，只有能对 pin 的版本编译通过才保留；
- `--llm`：用 Claude 生成摘要；
- 环境变量：`STALEMAP_GUARD_TSC=0` 让 guard 只报依赖变更；`STALEMAP_GUARD_DEPRECATIONS=1` 才报 deprecation；`STALEMAP_CACHE` 改缓存目录（默认 `~/.cache/stalemap`）；`$STALEMAP_PRECOMPUTED_URL` 使用预计算报告（约 200 个高频变动包，原文注明尚未托管）。

**10. 按需检索**

```bash
stalemap search <query>
```

对应 MCP 工具 `search_changes`（另有 `package_changes`、`project_changes`、`check_notes`）。检索范围含全部类型变更、release note 条目、缓存下来的升级指南笔记；排序为 BM25，兼做标识符拆分（`resolveAlias` 能匹配 “resolve alias”），并对项目用到的东西加权。首次检索建索引，之后离线。

**11. 裁剪笔记（可选）**

```bash
stalemap probe
```

让模型为每处变更写代码、对 pin 的版本做类型检查，再带笔记重跑；模型本来就会的笔记从笔记块里删掉。原文提醒：probe 任务直接点名旧 API，因此测的是「被指到时知不知道」，比「主动发现」容易。

**12. 数据边界（合规前提）**

包名与版本会发往 npm registry、GitHub（changelogs/releases，可用 `GITHUB_TOKEN` 或 `gh` 登录）与 models.dev；源码不上传，import 扫描在本地。使用 `--llm` / `--examples` / `--guides` 时，类型 diff、release note 片段、指南文本与导入的 API 名会发往 Claude（Anthropic API 或 `claude -p`），但不含代码；`probe` 的提示词发给你选的 provider；设置 `$STALEMAP_PRECOMPUTED_URL` 时只发包名不发版本。

## 对应的研究问题

**1. 能力发现**
把「训练截止后依赖 API 变化」这一类 agent 默认不知道自己不知道的工作显式交给它：agent 自己不会去查 changelog，stalemap 把这件事变成会话开始就摆到眼前的笔记。另有一个反向用法：`probe` 用来测量「哪些笔记是模型本来就会的」，把不该给的去掉——这是对「什么该交给 AI、什么不必」的量化手段。

**2. 任务匹配**
匹配：JS/TS 项目，尤其是依赖有大版本跨越、或紧贴发布节奏的项目。协作方式上，原文把三种通道配成一套——启动时注入（低成本、广覆盖）+ 编辑后 guard（错误驱动、即时反馈）+ 按需检索（agent 主动提问）。原文明确指出普通 `tsc` 钩子是 guard 的子集，二者不等价。不匹配：非 JS/TS；多 workspace/monorepo（只支持一个 `package.json`，尚无 workspace 遍历）；无自带类型的包只能靠 release note（`@types/*` 不做 diff）。

**3. 条件供给**
需要提供：模型名或明确的训练截止日（`--model` / `--cutoff`）；lockfile 或 `node_modules` 以确定 pin 版本；GitHub token 或 `gh` 登录以取 changelog/releases；选择 LLM 通道时需 Anthropic API 或 `claude -p`；comment 模式的 CI 需 `pull-requests: write` 权限。反馈通道是关键：guard 把项目自己的编译器错误连同匹配到的变更条目一起回给 agent，形成「写错 → 立刻看到原因 → 改正」的闭环，而不是把变更文档整篇塞进上下文。

**4. 主动推进**
由状态/事件触发的部分很具体：SessionStart hook 在启动、`/clear`、compaction 后自动注入；PostToolUse hook 在每次 Write/Edit 后自动检查；`npx stalemap check` 在 CI 里当笔记缺失或过期时 exit 1；GitHub Action 在 PR 改动依赖时自动生成/更新评论（含「模型已知 → 实际 pin」对照）。

**5. 效果验证**
原文给了完整验证设计：隐藏测试评分、headless Claude Code 会话、每个任务在 one-shot（仅文件工具）与 checks（可跑 `npm test`/`tsc`）两种模式下跑、每题 3 个 session、两层 bootstrap（先任务后运行）求区间、只有区间不含 0 才算胜。可迁移的指标：会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长、以及把「人工写一行点名变更的提示」当作天花板来估计还差多少。

## 与已有做法的关系

清单中相关条目：Claude Code（adopt）、Cursor（watch）、OpenCode（watch）。

- 对 Claude Code：stalemap 直接嵌入既有工作流（marketplace 插件 + SessionStart/PostToolUse hook + MCP server + `/stalemap:sync`、`upgrade` 两个 skill），可视为对 Claude Code 现有做法的补强——把「训练截止」这个盲区改成显式注入 + 编辑后编译校验，并且笔记块写在 `CLAUDE.md`/`AGENTS.md` 里，属于可提交、可 review 的项目文件，而不是个人本地配置。
- 对 Cursor / OpenCode：只有 `setup --agent` 生成配置文件这条路，且原文自述未在真实安装中试过；Cursor 还不把 `postToolUse` 的上下文传给模型，只能靠 stop-hook 兜底。这与清单里把二者标为 watch 的状态一致——值得关注，现在不宜当作成熟做法写进手册的「标准流程」。

清单中没有关于「依赖变更/变更日志注入」的同类条目，stalemap 填补的是这一格。

## 证据与局限

**原文给出的数据（held-out v4，盲测、预注册）**
- 66 个任务，按种子从 33 个流行 npm 包在某三个月窗口内发布的所有 breaking / deprecation / behavior change 中抽取；每任务每臂每模式每模型 3 个 session；构建在任何 v4 结果产生前冻结为 `freeze/v4-final`。
- 通过率：`claude-sonnet-5-5` 无辅助 68%、加普通 `tsc --noEmit` 钩子 73%、加 stalemap 89%、加一行手写提示（天花板）98%；`claude-sonnet-4-5` 分别为 46%、53%、64%、78%。
- 四个预注册比较均为胜，例如 sonnet-5-5 上 stalemap vs 无辅助 +20.7 点 [13.6, 28.3]（95%），vs tsc 钩子 +16.4 点 [7.6, 26.0]（98.3%）。
- 只在 one-shot 下收益最大：sonnet-5-5 上 89% vs 60%；有 checks 时 89% vs 77%。
- 首次编辑使用过期 API 的比例：sonnet-5-5 上 11% vs 无辅助 27%。
- 成本：sonnet-5-5 中位 $0.050 vs $0.041，轮数约 7 vs 8；sonnet-4-5 为 $0.124 vs $0.085、79s vs 47s。
- 早期套件：v1（预注册，10 任务）83% vs 50%，胜；v2（盲测，10 任务）35% vs 23%，平；v3（盲测，59 任务）53% vs 43%，胜但与普通 tsc 钩子打平，0.3/0.4 的改动来自 v3 记录暴露的问题（guard 没跑项目自带 TypeScript、笔记与检索丢失修复文本、检索用得不够），v4 是这些改动的首次盲测。

**属于作者主张、需打折的部分**
- 作者、benchmark harness、协议同一人；作者自述 v4 任务由从未见过 stalemap 代码/笔记/结果的另一个会话编写，并由一名独立盲审复核。缓解措施存在，但不等同于第三方独立评测。
- 只测了 JS/TS 与两个 Claude 模型；「其他 agent 和模型未测量」；与第三方工具的对比未发布。
- 项目早期、单人维护（0.4.1）。
- 原文使用 `claude-sonnet-5-5`、2026 年 7–10 月发布的任务集等标注，引用到手册时应以实际使用时的版本与日期为准。

**适用条件（原文 Limits）**
仅 JS/TS、单个 `package.json`（无 workspace 遍历）；无自带类型的包只能出 release note 笔记，`@types/*` 不做 diff；使用追踪止于导入名与 `x.member` 访问，`client.messages.create({ temperature })` 这类实例链不被追踪；不体现在类型签名里的行为变更只能靠 release note 与（开 `--guides` 时）升级指南，两者都没写到的设置它也无法覆盖；对散文式 changelog 的排序是启发式、偏噪；agent 有时会忽略正确的笔记——guard 只能兜住编译失败的部分和部分「仍能编译但已变」的情况（移动的配置键/成员、改名的文件），其余过期代码只有在有笔记覆盖时才被兜住。

## 怎么试、怎么验证

**最小试用（半天内可完成，一个仓库）**
1. 选一个依赖明显落后于模型训练截止的 JS/TS 仓库，记下当前 lockfile。
2. 跑 `npx stalemap` 只预览，检查笔记里是否真的点到了你会踩的 API（人工判断准确性），记录笔记块 token 量（默认上限 1800，可用 `--budget` 收紧）。
3. 跑 `npx stalemap sync` 写入，提交；CI 加 `npx stalemap check`。
4. Claude Code 装插件（`/plugin marketplace add Umair/stalemap` + `/plugin install stalemap@stalemap`），确认 SessionStart 与 PostToolUse 两个 hook 实际触发（看一次编辑后是否出现 guard 输出）。
5. 如果团队用 Cursor/Codex/OpenCode，先只跑 `stalemap setup --agent <x> --dry-run` 看会改哪些文件，别急着当真（原文未验证）。

**判断是否改善的指标**
- 主指标：在你自己仓库的若干「依赖升级后需改代码」任务上，同一模型、同一提示下，加 stalemap 与不加的通过率（用仓库自带测试或隐藏测试评分，避免 agent 自评）。
- 过程指标：agent 首次编辑就使用过期 API 的比例（从会话记录里数）；guard 报出的「依赖相关错误」中有对应笔记解释的比例（衡量笔记覆盖率）；guard 误报/噪声量（衡量是否值得常开）。
- 成本指标：单会话 token 成本与时长、笔记块 token 数、`npx stalemap check` 在 CI 的耗时。
- 反向指标：用 `stalemap probe` 看有多少笔记是模型本来就会的，过多说明预算浪费。
- 停止条件：若加 stalemap 后通过率提升落在噪声范围内、或 guard 噪声导致团队频繁关掉它（`STALEMAP_GUARD_TSC=0`），则停在 study/watch，不进手册的默认流程。
