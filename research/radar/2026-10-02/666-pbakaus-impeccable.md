# pbakaus/impeccable

- 结论：**值得一试**。建议先在前端项目上小范围试：按 `npx impeccable install` + `/impeccable init` 把持久产品事实（PRODUCT.md）和视觉系统（DESIGN.md）固定下来，再用 `npx impeccable detect --json` 建立可量化的基线并把检测接进 hook/CI 当验收门槛；它把“给智能体供给上下文+约束+自动反馈”写成了可照抄的步骤，但改善效果目前只有作者主张和一个未展开的案例页，缺实测数据。
- 原文：https://github.com/pbakaus/impeccable
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T10:27:44.268Z

## 是什么

Impeccable 是一套给 AI 编码智能体用的前端设计指导套件（作者 Paul Bakaus，Apache 2.0），由四部分组成：

- 1 个 skill：所有命令都通过 `/impeccable <command> <target>` 调用；
- 24 条命令：`init`/`craft`/`shape`/`critique`/`audit`/`polish`/`distill`/`harden`/`animate`/`typeset`/`layout`/`live`/`generate` 等，构成你和 AI 之间的共享设计词汇表；
- 61 条确定性检测规则（deterministic detector rules）+ LLM-only 的 critique 检查：CLI 和浏览器扩展跑确定性规则时不需要 LLM、不需要 API key；
- hook：在支持的 harness 上装 provider 原生 hook，直接编辑 UI 文件时跑检测并把结果送回 agent 流程。

作者自述它从 Anthropic 的 frontend-design skill 起步，解决“所有模型都在同一套 SaaS 模板上训练，不加指导就产出同样的坏味道”（Inter 字体、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标）。

它的方法论价值超出前端：把“耐久事实”与“表层方向”分开写进仓库文件、给智能体一套共享命令词汇、用确定性规则做可自动执行的守门人——这三件事可以迁移到任何需要稳定产出的任务。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提确认**：项目涉及前端/UI；本地有 Node（只为 `npx` 本身，skill 和 hook 自带引擎二进制，不需要 Node 运行时）。在项目根目录执行：

```bash
npx impeccable install
```

安装器会列出检测到的 harness 目录（例如 `~/.claude`、`~/.codex`、`~/.grok`、`~/.hermes`、`~/.veto`，或项目内 `.cursor`），让你保留检测集或自定义 provider，然后问装进当前项目还是全局。脚本化时跳过这两次选择：

```bash
npx impeccable install --providers=claude,codex,cursor,grok,hermes,veto --scope=project|global
```

在 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 上，它还会为当前项目安装 provider 原生 hook manifest。装完**重载 harness**。刷新已有安装用 `npx impeccable update`。

2. **建立持久上下文（每个新项目一次）**：在 AI 工具里运行

```bash
/impeccable init
```

`init` 会检查项目、只追问“耐久产品事实”里缺失的部分，写出 `PRODUCT.md`（受众、目的、运行环境、约束、语气、证据）。访客模式和视觉方向留到每个 surface 再定；现有或新建的视觉系统单独记录在 `DESIGN.md`。这一步是关键做法：**把持久事实与表层视觉方向分开存**，避免后续命令把两者混淆。

3. **用命令表干活**（全部经 `/impeccable` 调用，多数命令可带一个区域参数）：

```
/impeccable craft      # 完整“先定形再构建”流程，带视觉迭代
/impeccable shape      # 写代码前先规划 UX/UI
/impeccable critique   # UX 设计评审：层级、清晰度、情感共鸣
/impeccable audit      # 技术质量检查（a11y、性能、响应式）
/impeccable polish     # 收尾：对齐设计系统、可发布性
/impeccable harden     # 错误处理、i18n、文本溢出、边界情况
/impeccable document   # 从现有代码生成根目录 DESIGN.md
/impeccable extract    # 把可复用组件与 token 抽进设计系统
/impeccable live       # 浏览器内逐元素迭代的视觉变体模式
```

带目标的例子：

```
/impeccable audit blog           # 审 blog 首页 + 文章页
/impeccable critique landing     # UX 设计评审
/impeccable polish settings      # 发布前收尾
/impeccable harden checkout      # 加错误处理与边界情况
/impeccable redo this hero section
```

常用命令可以固定成独立快捷命令：`/impeccable pin audit` 生成 `/audit`。

4. **建立确定性检测基线**（不需要 LLM、不需要 API key）：

```bash
npx impeccable detect src/                   # 扫目录
npx impeccable detect index.html             # 扫单个 HTML
npx impeccable detect https://example.com    # 扫 URL（用本地已装的 Chrome/Chromium/Edge）
npx impeccable detect --json .               # CI 友好的 JSON 输出
npx impeccable detect --no-config src/       # 忽略项目配置的原始扫描
```

退出码语义（做门禁时依赖它）：`0` 扫描完成且无 primary findings；`2` 扫描完成但有 primary findings；`1` 至少一个目标无法扫描（多目标部分失败时操作失败优先）。人类可读的 findings 写 stderr，所以重定向：`npx impeccable detect src/ 2> findings.txt`；机器可读用 `--json` 走 stdout。

5. **把检测接成自动反馈**：在 Claude Code、GitHub Copilot、Codex、Cursor、Grok Build 上，安装/更新会写入 provider 原生 hook manifest，直接编辑 UI 文件时触发检测：Claude Code / GitHub Copilot / Codex 在编辑后提示（支持时在 Stop 再跑一次更深的 pass），Grok Build 编辑后先扫、在 Stop 才把结果给模型，Cursor 在坏的写入落地前就拦。配套注意：Codex 装或更新后要打开 `/hooks` 批准项目 hook（Codex 按 hook 定义记信任，改了 `.codex/hooks.json` 可能需再次批准）；Grok Build 需要项目目录信任（`/hooks-trust` 或 `--trust`）。

6. **配置检测的忽略与豁免**：忽略规则写在 `.impeccable/config.json` 的 `detector` 键（`detector.ignoreRules`、`detector.ignoreFiles`、`detector.ignoreValues`、`detector.designSystem.enabled`），`/impeccable hooks` 和 `npx impeccable detect` 共用。命令行方式：

```bash
npx impeccable ignores list
npx impeccable ignores add-file "src/legacy/**"
npx impeccable ignores add-value overused-font Inter --reason "Brand font"
```

只想让某个文件豁免，就在文件里写内联注释（任意注释语法均可，作用域是整个文件）：

```html
<!-- impeccable-disable overused-font: exported brand doc -->
```

细到一行用 `impeccable-disable-line` 或 `impeccable-disable-next-line`；`--no-inline-ignores` 或 `--no-config` 会绕过内联豁免。

7. **把产物按“可提交/一次性”分开**，`.gitignore` 直接复制：

```gitignore
# impeccable-ignore-start
# Ephemeral output, runtime state, and per-dev overrides.
# The **/ prefix covers .impeccable at the repo root or in a nested workspace.
# Shared artifacts stay tracked: config.json, live/config.json,
# design.json, surfaces/*.md, critique/*.md.
**/.impeccable/config.local.json
**/.impeccable/hook.cache.json
**/.impeccable/hook.pending.json
**/.impeccable/*.png
**/.impeccable/review/
**/.impeccable/questions/
**/.impeccable/live/server.json
**/.impeccable/live/sessions/
**/.impeccable/live/previews/
**/.impeccable/live/annotations/
**/.impeccable/live/cache/
**/.impeccable/live/manual-edit-apply-transaction.json
**/.impeccable/live/manual-edit-events.jsonl
**/.impeccable/live/manual-edit-evidence/
**/.impeccable/live/pending-manual-edits.json
**/.impeccable/live/deferred-svelte-component-accepts.json
**/.impeccable/live/*.png
# impeccable-ignore-end
```

**必须保留跟踪**（共享项目产物，不要加进 `.gitignore`）：`.impeccable/config.json`、`.impeccable/live/config.json`、`.impeccable/design.json`、`.impeccable/surfaces/*.md`（按路由/产物的策略与方向契约）、`.impeccable/critique/*.md`（评审报告）。若一次性文件已被提交，`.gitignore` 不会自动取消跟踪，用 `git rm --cached <path>`。

8. **选构建路径 comp-first 还是 code-first**：`/impeccable init` 问一次并记进 `.impeccable/config.json`：

```json
{ "buildPath": "comp" }
```

只读 `comp` 和 `code` 两个值。comp-first 先出高保真稿再对齐构建（更大胆、更慢）；code-first 直接在代码里建、把野心写进 surface brief 的 dev-only 方向契约、收尾时核对（更轻、更快）。单机覆盖写 `.impeccable/config.local.json`（适合你的 harness 没有图像生成时）；monorepo 在仓库根提交一次，个别 workspace 可自设。这个选项只在有图像生成能力时出现。已有项目不必重跑 `init`：每个决策页脚有切换开关，翻转只作用于当前会话，在没记录过的项目上翻一次后它会问是否保留并写入。

9. **团队用 Git submodule 版本化安装**（想让 Impeccable 跟着 Git 走）：

```bash
git submodule add https://github.com/pbakaus/impeccable .impeccable
npx impeccable link --source=.impeccable --providers=claude,cursor
git add .gitmodules .impeccable .claude .cursor
git commit -m "Add Impeccable skills"
```

更新：

```bash
git submodule update --remote .impeccable
npx impeccable link --source=.impeccable --providers=claude,cursor
```

`link` 从 `.impeccable/dist/universal/` 链接单个 skill 目录，不动已有的真实 skill 目录，除非加 `--force`。

10. **把反模式写成项目规范**（skill 自带的明确禁止项，可直接抄进团队约定）：

- 不用过度使用的字体（Arial、Inter、系统默认）；
- 不在彩色背景上用灰色文字；
- 不用纯黑/纯灰（永远带色调）；
- 不把什么都包进卡片，不卡片套卡片；
- 不用 bounce/elastic 缓动（显旧）。

11. **安全边界与前置条件**（照做前必须知道）：

- live mode 只能对本地 checkout（通过 dev server 或本地静态 HTML）生效；把它的 localhost HTTP helper 注入已部署的生产站点（含 HTTPS）**不受支持**，也不要为了让它在生产跑而关浏览器安全或放宽 CSP。
- 生产页面只做检查：`npx impeccable detect https://example.com` 或浏览器扩展；它们只看渲染结果，不提供实时变体编辑，也不回写源码。
- live mode 的复制编辑自动应用时会以你的用户权限在 shell 里跑 `package.json` 的可选 `scripts["impeccable:manual-edit-validate"]`，在不熟悉的 checkout 里用之前先审这个脚本。
- 只在你有把握本地运行的项目里用 live mode。
- 调试 hook 时在 `.impeccable/config.json` 设 `hook.auditLog` 为某路径（或旧版 `IMPECCABLE_HOOK_LOG` 环境变量），每次 hook 调用写一行 NDJSON；正常使用不要设。
- 想临时关掉 Claude Code 的全部 hook：`--settings '{"disableAllHooks": true}'`。安装器会保留无关 hook 项和设置；manifest 格式错误时默认中止，加 `--force` 会备份成 `.bak` 再替换。
- Hermes 把项目本地 skill 视为提示注入载体，项目级安装后要在项目根跑一次 `hermes skills trust`；全局装进 `$HERMES_HOME/skills/` 免信任步骤；Hermes 不装设计 hook（没有 hook 面）。

12. **手动/离线安装兜底**（正常路径是 `npx impeccable install` + `npx impeccable update`，下面只是 fallback）：按 harness 复制 `dist/<provider>/` 下的目录，例如 Cursor `cp -r dist/cursor/.cursor your-project/`（Cursor 需在 Settings→Beta 切 Nightly、在 Settings→Rules 开 Agent Skills）；Claude Code `cp -r dist/claude-code/.claude your-project/` 或 `cp -r dist/claude-code/.claude/* ~/.claude/`；Codex 项目内 `cp -r dist/agents/.agents your-project/` 且 `cp dist/codex/.codex/hooks.json your-project/.codex/hooks.json`；Gemini CLI 需 preview 版 `npm i -g @google/gemini-cli@preview` 后在 `/settings` 开 Skills 并用 `/skills list` 验证。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做、但还没想到交给它的工作）**
- 设计评审与 UX 批评：`critique`（层级、清晰度、情感共鸣）、`audit`（a11y、性能、响应式）、`polish`、`distill`、`harden`（错误处理、i18n、文本溢出、边界情况）——这些通常被当成人的事，原文明确把它做成了可调用的命令。
- 61 条确定性规则不需要 LLM 和 API key 就能跑，说明一类“质量守门”工作可以完全脱离模型判断来做，而不是交给模型评审。
- 浏览器内的视觉变体生成：`live` / `generate` 可以“给命名元素生成变体，无需手工挑选”。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 原文把“设计工作”匹配给“装了 skill 的编码 agent + hook + 确定性检测”这一组合，而不是单靠模型提示。
- 工具面给了区分：CLI/浏览器扩展适合生产页面的只读检查；live mode 适合本地 checkout 的迭代编辑；hook 适合编辑时的即时守门；`--json` + 退出码适合 CI。
- 按 harness 有差异：Cursor 在写入落地前拦截、Claude Code/Copilot/Codex 编辑后提示、Grok 在 Stop 才把结果给模型、Hermes 无 hook 面、Veto 只收打包 skill 不跑原生 edit hook。原文没有讨论不同模型之间的选择差异。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 信息：`PRODUCT.md`（受众、目的、运行环境、约束、语气、证据）、`DESIGN.md`（既有或新建视觉系统）、`.impeccable/surfaces/*.md`（按路由/产物的策略与方向契约）、`.impeccable/design.json`（共享设计规格）。
- 工具：CLI 引擎二进制（随 skill 附带或首次运行时下载到 `~/.impeccable/bin/`）、Node（仅 `npx`）、本地 Chrome/Chromium/Edge（URL 扫描）。
- 权限：项目 hook 需要显式信任——Codex `/hooks` 批准、Grok `/hooks-trust` 或 `--trust`、Hermes `hermes skills trust`、VS Code 扩展要求受信任的本地 workspace。
- 反馈：hook 把检测结果送回 agent 流程；`critique/*.md` 留下评审报告；`hook.auditLog` 提供 NDJSON 调试日志；detector 的忽略/豁免机制让团队能表达“这是有意的例外”。
- 配置面：`.impeccable/config.json`（共享，含 `hook`、`detector`、`buildPath`）与 `.impeccable/config.local.json`（每开发者、每机器覆盖，gitignore）。

**4. 主动推进（可由时间、事件或状态触发并持续完成）**
- 事件触发：hook 在直接 UI 文件编辑时自动跑检测；Claude Code/Copilot/Codex 在编辑后、支持时在 Stop 再跑一次更深的 pass；Cursor 在写入前拦截；Grok 编辑后扫、Stop 时呈现。
- 状态对比：Stop pass 在有可信的编辑前基线时，会抑制已确认的既有问题，只把新问题标为 new；无法归属的标为 attribution unknown（原文明确说 unknown 不等于“是你的会话造成的”）。
- 持续可用：`/impeccable pin <command>` 把高频命令固化成快捷入口。原文没有提到时间触发的定时任务。

**5. 效果验证（怎样判断确实改善了结果）**
- 确定性检测给出可机器判读的结果：`--json` 输出、退出码 0/2/1，可作为 CI 门禁。
- 编辑前后基线对比：确认的既有 findings 会被抑制，新 findings 单独标记。
- 原文同时给了这条证据的边界：**“一次干净的检测只是证据，不是视觉或无障碍质量的证明”**，不能替代在相关视口下检查真实渲染体验。
- 案例：Neo Mirai 前后对比案例页（原文只给链接，正文未含数据）。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：Impeccable 的首要集成对象之一，`/impeccable <command>` 直接在 Claude Code 里用，hook 写进 `.claude/settings.local.json`（机器本地、gitignored）。可作为 Claude Code 已有用法之上的“设计层 + 自动守门层”插件。
- **Agent skills（adopt，概念）**：Impeccable 就是一个 skill 的完整实例，覆盖安装（多种 harness）、分发（plugin/marketplace/submodule/manual copy）、命令路由、hook 生命周期、信任与安全考量。可以当作“怎么写一个能落地的 skill”的参考样本。
- **Cursor（watch）、DeepSeek Harness（watch）、OpenCode（watch）、Hermes（watch）、Google Antigravity（watch）**：原文都在支持列表和安装路径里给了具体目录与命令（`.cursor/hooks.json`、`dist/dsh/` 与 `DSH_HOME`、`dist/opencode/.opencode`、`dist/hermes/`、`dist/antigravity/.agent`），如果这些条目在清单里升到 try/adopt，Impeccable 提供了现成的接入步骤。
- **GitHub Copilot（drop）**：清单里标记为 drop，但 Impeccable 把 GitHub Copilot 列为受支持 harness（`.github/hooks/impeccable.json`，且需要默认分支 + 文件夹信任才生效），VS Code 还提供扩展 `renaissance-geek.impeccable`（要求 VS Code 1.109.3+、Copilot Chat、受信任本地 workspace）。这两处判断存在张力，值得在手册里说明是“清单判断与工具支持范围不同”还是需要复核。
- **DeepSeek（try）**：清单里的 DeepSeek 是模型/工具，原文的相关项是 DeepSeek Harness（`.dsh` 目录、`DSH_HOME` 只在解析到 home 内时才遵守），二者不是同一个东西，不要混用。
- 原文提到 Anthropic 的 frontend-design skill 是它的起点，该条目不在给定清单中。
- 清单中没有与“61 条确定性检测规则 + hook 守门”直接对应的条目；这部分是新的增量。

## 证据与局限

**原文给出的可核验信息**
- 结构清晰可数：1 个 skill、24 条命令（含完整命令表）、61 条确定性检测规则；检测器不需要 LLM 或 API key。
- 大量可直接照抄的工程细节：安装与更新命令、`--providers`/`--scope`/`--force`/`--no-hooks` 参数、退出码语义、`.gitignore` 块、`buildPath` 取值、内联豁免语法、各 harness 的 hook 文件路径与信任步骤。
- 输入材料附带的仓库指标：74,345 stars、当日新增 463（来自 GitHub trending 指标字段）。这只说明关注度，不构成效果证据。

**只是作者主张、未提供数据**
- “每个模型都在同一批 SaaS 模板上训练，不加指导就会产出同样的坏味道”——作者的归因判断。
- 24 条命令和 61 条规则能改善设计结果——原文未给 A/B、评分或返工率数据。
- Neo Mirai 案例页被引用为“真实项目的 before/after”，但正文没有该案例的任何数字或细节，材料里也无法核验。
- comp-first“更大胆但更慢”、code-first“更轻更快”——作者的经验判断，无量化。

**适用条件与限制**
- 领域限定在前端/UI 设计；对后端、数据、写作等任务没有直接步骤（但“耐久事实文件 + 共享命令词汇 + 确定性守门”这套模式可迁移）。
- comp-first 只在有图像生成能力时才有意义。
- live mode 仅限本地 checkout，不支持注入生产站点，也不能为它放宽 CSP。
- URL 扫描受浏览器安全限制，无法在无 CORS 的情况下读取跨源 CSS；URL 扫描依赖本地已装 Chrome/Chromium/Edge。
- 原文自陈：干净的检测“是证据，不是视觉或无障碍质量的证明”，必须人工看真实渲染。
- 各 harness 存在差异化限制（Hermes 无 hook、Veto 不跑原生 edit hook、Codex 与 Grok 需额外信任步骤）。
- 材料来自 README，无法验证 61 条规则的实际覆盖质量、误报率，也无法验证 hook 在不同 harness 上的真实稳定性。

## 怎么试、怎么验证

**最小试用（建议 1 个项目、1–2 周、项目级安装，不动全局）**

1. 选一个正在做的前端项目，项目级安装：`npx impeccable install --scope=project`（如想先不引入自动 hook，加 `--no-hooks`）。
2. 跑 `/impeccable init` 生成 `PRODUCT.md`，人工读一遍，检查它记录的受众、目的、约束、语气是否准确——这一步本身就在验证“耐久事实供给”是否可行。
3. 建立基线并留档：

```bash
npx impeccable detect --json . > before.json; echo "exit=$?"
npx impeccable detect src/ 2> before.txt
```

4. 用同一批任务做对照：选 3–5 个真实改动，每个改动先按平常方式做一遍（记录耗时与主观满意度），再用对应命令做一遍，例如 `/impeccable critique landing`、`/impeccable polish settings`、`/impeccable harden checkout`。
5. 复测并对比：

```bash
npx impeccable detect --json . > after.json; echo "exit=$?"
```

6. 若基线可接受，再开启 hook（重跑 `npx impeccable install`，交互里选装 hook，并按 harness 完成信任：Codex `/hooks`、Grok `/hooks-trust`），观察一周内 hook 拦下了什么、误报多少。

**判断有没有改善的指标**

- 主指标：`detect --json` 里 primary findings 的数量变化，以及退出码从 2 变 0 的改动比例；把 `npx impeccable detect --json .` 放进 CI 后，作为合并门槛后“设计类问题在评审阶段被发现的比例”。
- 过程指标：hook 触发后新 findings 中被接受修复 vs 被忽略/豁免的比例（误报率）；被豁免的规则是否集中在同一批规则上（说明规则与项目审美冲突，而不是代码问题）。
- 人工指标（因为原文明确检测不等于质量）：同批改动做盲评，让不了解来源的评审者按“层级清晰度、视觉一致性、可发布性”三点评分；统计设计相关返工次数与发布前临时修补耗时。
- 反向指标：命令带来的额外 token/时间成本，以及是否出现“为了过检测而改坏设计”的情况（此时应改配置豁免，而不是迁就规则）。
- 结论门槛建议：primary findings 明显下降 **且** 盲评不劣化 **且** 返工次数不增加，才算改善；只要盲评变差，就把 verdict 从 try 退回 study，只借鉴“PRODUCT.md/DESIGN.md + 确定性守门”这套结构，不采用具体工具。
