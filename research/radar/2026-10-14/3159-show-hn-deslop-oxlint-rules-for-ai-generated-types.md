# Show HN: Deslop – Oxlint rules for AI-generated TypeScript

- 结论：**值得一试**。建议在 TypeScript + Oxlint 项目中接入 ai-deslop 的 recommended 配置做小范围试用，用真实 AI 生成 diff 验证命中率和误报；README 给出了可直接复制的安装与配置、规则清单，但没有效果数据，且规则较主观，只有适配的团队才应保留。
- 原文：https://github.com/maharshi365/deslop
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T12:02:38.954Z

## 是什么
ai-deslop 是一组面向 AI 生成 TypeScript 代码的 Oxlint 规则包。它把 dmmulroy/anti-slop 的通用规则 vendored 进来，并增加 deslop 规则，统一放在 `deslop/*` 命名空间下。目标是拒绝“低证据、低信号、AI-slop”代码模式，覆盖类型安全与证据、代码质量与 API、测试、以及可选项。包发布编译后的 JavaScript，可用于任何 oxlint JS-plugin 运行时（Bun、Deno 或 Node.js）。许可证 MIT。

## 具体做法
1. 前提：项目使用 TypeScript，并且已经使用 Oxlint，且运行环境支持 oxlint JS 插件（Bun、Deno 或 Node.js）。安装为开发依赖：
```bash
npm install --save-dev ai-deslop
# @oxlint/plugins comes along as a runtime dependency — keep it in sync with your oxlint version
```
2. 前提：项目有 Oxlint 配置入口。按 README 示例加入 JS 插件和 recommended 配置：
```ts
import { defineConfig } from "oxlint";
import { configs as deslopConfigs } from "ai-deslop";

export default defineConfig({
  jsPlugins: ["ai-deslop"],
  options: deslopConfigs.recommended.options,
  rules: deslopConfigs.recommended.rules
});
```
3. 用项目现有方式运行 Oxlint。README 没有给出 CLI 命令，只说这个配置会启用规则。重点观察 recommended 规则报告的问题。
4. recommended 规则覆盖三类：类型安全与证据（如 `no-chained-type-assertions`、`no-unknown-parameters`、`no-unknown-returns`、`require-safety-comment-for-type-assertion`）、代码质量与 API（如 `no-array-filter-map`、`no-reduce-accumulator-copy`、`no-reflect-apply`、`no-reflect-get`）、测试（如 `no-call-only-assertions`、`no-module-mocking`、`no-poor-substring-tests`、`no-repeated-expect-call`）。同时 recommended 还启用若干标准规则：`typescript/no-deprecated`、`typescript/no-require-imports`、`typescript/no-floating-promises`、`typescript/no-unnecessary-condition`、`no-unreachable`；其中部分规则需要 type-aware linting。
5. 如需更强检查，再按文档启用 opt-in 规则：`no-duplicate-consts`、`no-duplicate-types`、`no-renamed-imports`、`canonical-class-names`。README 没有在正文给出这些规则的完整配置，只指向 `docs/*.md`。注意 `no-repeated-expect-call` 和 `no-duplicate-types` 没有 fixer；`no-renamed-imports` 和 `canonical-class-names` 是 Fix 类规则。
6. 根据项目风格决定是否保留全部 recommended。原文称这些规则是 opinionated，且目标是拒绝“AI-slop”模式，不是只报 bug。

## 对应的研究问题
- 能力发现：它把“AI 生成 TypeScript 后做质量检查”具体化为可配置的 lint 规则，能发现链式类型断言、把已知值 widened 到 unknown/object、空对象条件 spread、仅检查 mock 调用的测试、常量字符串子串测试、重复常量/类型、非规范 Tailwind 类名等模式。
- 任务匹配：适合 TypeScript 项目、且已使用 Oxlint 的代码库，尤其适合接在 AI 编码代理产出后的本地/CI 检查环节。不适合非 TypeScript 项目，或没有 Oxlint/JS 插件运行时的项目。
- 条件供给：需要安装 `ai-deslop` 作为 devDependency；需要 `@oxlint/plugins` 与 oxlint 版本保持同步；需要在 Oxlint 配置中提供 `jsPlugins`、`options`、`rules`；部分标准规则需要 type-aware linting；opt-in 规则需要再读对应文档。
- 主动推进：原文没有给出时间、事件或状态触发配置，也没有给出 CI、pre-commit 或 agent 后置步骤的接入示例。它只是一个 lint 规则包，是否自动运行取决于调用方；因此没有可直接照做的主动推进流程。
- 效果验证：原文没有给任何命中率、误报率或代码质量提升数据。可验证的是规则是否报告了你关心的模式，以及修复后是否减少同类违规；这需要自行定义指标。

## 与已有做法的关系
清单中没有相关条目。它自身与 `dmmulroy/anti-slop` 相关：通用规则是从该项目 vendored 而来，MIT 许可，并重命名到 `deslop/*` 命名空间下。

## 证据与局限
- 原文是仓库 README。给出了安装命令、Oxlint 配置示例、推荐规则与 opt-in 规则清单，但没有给出具体代码违规示例、基准数据、误报率或用户案例。
- “拒绝低证据、低信号、AI-slop 代码模式”是作者的目标主张，不是已被数据验证的结论。
- 规则较 opinionated：例如 `no-object-parameters`、`no-unknown-parameters`、`no-module-mocking` 等会直接拒绝一类写法，可能不适合所有团队约定。
- 部分标准规则需要 type-aware linting；部分规则没有 fixer，修复需要人工；opt-in 规则的完整配置在文档中，输入材料只给了链接。
- 来源页显示 HN 31 points、7 comments，但没有评论内容或外部验证数据；这不构成质量证据。
- 适用条件：TypeScript + Oxlint + 可运行 JS 插件的运行时（Bun、Deno、Node.js）。许可证 MIT。

## 怎么试、怎么验证
- 最小试用：选一个使用 TypeScript 和 Oxlint 的包，安装 `ai-deslop`，只启用 README 中的 recommended 配置；先跑当前代码库，观察噪音，再跑一段 AI 生成的 diff。
- 验证指标：按规则统计违规数量与类型；人工判断其中有多少是真正需要修的问题、多少是误报；记录修复耗时；比较启用前后同类问题在代码评审或 CI 中是否减少。原文没有给基准，所以只能做项目内前后对比。
- 判断是否保留：如果 recommended 规则在真实代码上误报可接受，并且能抓住此前漏掉的 AI 代码模式，就保留；如果规则大量拒绝团队已接受写法，就只保留子集或放弃。
