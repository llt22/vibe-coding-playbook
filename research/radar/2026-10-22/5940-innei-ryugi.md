# Innei/ryugi

- 结论：**值得一试**。建议在已使用的编码智能体 harness 中小范围试用 Ryugi：选一个带测试和 UI 验收需求的小任务，按“头脑风暴→批准规格→TDD 实现→一次复审→UI 验收”走完，并用是否先出规格、红绿测试记录、UI 验收轮次和返工次数判断效果。理由是安装命令和工作流步骤足够具体，但原文只有作者主张，缺少量化效果证据。
- 原文：https://github.com/Innei/ryugi
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T12:33:50.417Z

## 是什么

Ryugi 是一个面向编码智能体的软件开发工作流：先通过 mockup 和追问做头脑风暴，把对话提炼成可批准的规格，再在 TDD 下逐任务实现，最后做一次全新复审和 UI 验收。它由若干可组合技能和一个 bootstrap 组成，起始于 Superpowers v7.0.0 的 fork，并被重塑为单一工作流。核心流程是：Idea → brainstorming → artifacts（artboard/document/html）→ Approved spec → executing-specs → per-task TDD → one fresh review → verifying-ui → 人工落地。

## 具体做法

1. **确认前提**：使用受支持的编码智能体 harness；如果同时使用多个 harness，需要在每个里面分别安装。`ryugi-artifacts` 需要 Node.js。项目自己的技能在对应步骤优先，例如 mockup 前的设计系统、报告前的 verify 技能、合并用的 ship 技能。

2. **在 Claude Code 安装**（原文命令）：
```text
/plugin marketplace add Innei/ryugi
/plugin install ryugi@ryugi-dev
```

3. **按 harness 选择安装方式**。原文给出的部分命令：
```text
agy plugin install https://github.com/Innei/ryugi
```
```text
devin plugins install Innei/ryugi
```
```text
droid plugin marketplace add https://github.com/Innei/ryugi
droid plugin install ryugi@ryugi
```
```text
gemini extensions install https://github.com/Innei/ryugi
```
```text
/plugins install https://github.com/Innei/ryugi
```
```text
pi install git:github.com/Innei/ryugi
```
```text
qwen extensions install Innei/ryugi
```
```text
hermes plugins install Innei/ryugi --enable
```
```text
muse plugins install ./
muse plugins approve ryugi
```
Cursor 需把该仓库添加为本地插件源，OpenCode 需按 `.opencode/INSTALL.md` 安装；原文没有给出这两者的完整命令。

4. **用干净会话验证安装**：发送：
```text
Let's make a react todo list
```
正常工作流应在写任何代码前触发 `brainstorming`。

5. **进入 brainstorming**：让 agent 先问“你真正想做什么、为什么”，一次一个问题；当工作跨模块、涉及架构，或你要求 upfront design 时，问题转入文档，按轮次回答。视觉方案在 Artboard 上一轮轮给出选项；小改动在聊天中确认，项目则产出 builder 可据此实现的设计文档。

6. **批准规格并选择 inline 实现**：批准 spec 后，`executing-specs` 激活。若你明确说 `just code it`，则跳过该流程直接写代码。

7. **执行规格**：agent 把 spec 切成任务，每个任务在 TDD 下实现；用 ledger 跨 compaction 记录每个判断（ruling）；完成后做一次 fresh review，然后停下并报告如何落地。默认 squash，也支持 rebase、PR、keep；原文明确 never a merge commit。

8. **每个任务走 TDD**：RED-GREEN-REFACTOR：先写失败测试，看它失败，写最小代码，看它通过，提交。

9. **遇到 bug 先根因**：`systematic-debugging` 在出现 bug 或意外行为时激活，要求先找根因再修。

10. **UI 变更做验收**：`verifying-ui` 在构建结果或修复改变可见界面时激活。把真实截图和录屏与已批准设计（或 before/after）并排放在 Artboard，在浏览器中逐组 pass 或 reject；被拒绝的修到全部通过。

11. **需要隔离时用 worktree**：`using-git-worktrees` 按你声明的偏好执行；没有偏好时，`executing-specs` 默认就地工作，只有当工作会与其他 agent 冲突时才开 worktree，例如文件有他人未提交修改、路径被其他 agent 探索、lockfile、切分支或仓库级变更。

12. **浏览项目产物**：
```bash
npx ryugi-artifacts
npx ryugi-artifacts /path/to/project
npx ryugi-artifacts --no-open
```
该命令读取项目内 `.ryugi/artifacts/`，提供预览、类型过滤、标题/id 搜索和排序；同一 CLI 也支持 `start`、`stop`、`publish`。

## 对应的研究问题

- **能力发现**：原文明确让 AI 承担写代码前的需求追问、规格提炼、Artboard mockup 对比、HTML 测试台生成、任务切片、TDD 实现、根因调试、分支复审、UI 截图验收和落地方式报告。
- **任务匹配**：适合从想法到实现的编码任务，尤其是需要先对齐规格、再逐任务 TDD、且有 UI 验收需求的场景。原文列出多种 harness，但没有说明不同模型如何选择；协作方式是 agent 自动触发技能，人批准 spec、在浏览器中通过/拒绝 UI，并最终由人落地。项目自有技能在对应步骤优先。
- **条件供给**：需要安装插件到所用 harness；`ryugi-artifacts` 需要 Node.js；需要人批准规格、给出 worktree 偏好、在浏览器中做 UI 验收；项目最好已有设计系统、verify、ship 等自有技能；artifacts 全部本地运行，无订阅。
- **主动推进**：技能自动触发，原文称无需手动 invoke；触发条件包括构建前、批准 spec 并选择 inline 后、实现中、出现 bug 时、UI 变化时、需要隔离时。原文还称“两小时自主推进、不问 should I continue”是常态，但这是作者主张，未给数据。
- **效果验证**：干净会话发 `Let's make a react todo list` 可验证 brainstorming 是否触发；每任务有红绿 TDD；ledger 记录判断；整条分支做一次 fresh review；UI 变更用截图/录屏逐组 pass/reject；最后报告落地方式。

## 与已有做法的关系

- **Claude Code（adopt）**：Ryugi 直接支持 Claude Code 安装，作为插件化工作流叠加在已采用的 harness 上。
- **obra/superpowers（study）**：Ryugi 是 Superpowers v7.0.0 的 fork，沿用其技能设计、TDD 与调试纪律以及多数 harness 集成，但重塑为单一工作流；可作为 Superpowers 思路的具体落地变体研究。
- **Cursor（watch）**：原文说可把该仓库添加为本地插件源，但只给了 detail 链接，没有完整命令。
- **Hermes（watch）**：原文给出 `hermes plugins install Innei/ryugi --enable`。
- **OpenCode（watch）**：原文指向 `.opencode/INSTALL.md`，未在 README 给出完整安装命令。

## 证据与局限

原文提供了可照做的安装命令、CLI 命令、工作流步骤、触发条件和 mermaid 流程图，以及安装验证方法；这些是具体证据。仓库指标显示 47 stars。原文没有给出量化效果数据、对照实验或真实案例，以下内容只是作者主张：两小时自主推进、技能自动触发无需调用、默认 squash 且从不 merge commit、ledger 能跨 compaction 保留判断。适用条件是使用受支持的 harness、需要 Node.js 的 artifacts 功能、项目有测试和 UI 验收需求，并接受先规格后实现的较重流程。原文是 README，未验证实际安装后的行为；作为 fork，还需关注与上游 Superpowers 的差异和后续维护。

## 怎么试、怎么验证

最小试用：在 Claude Code 中按上述两条命令安装，开一个干净会话发送 `Let's make a react todo list`，确认写代码前触发 `brainstorming`。然后选一个规模小、带测试和 UI 验收需求的任务，完整走一遍 brainstorm → 批准 spec → executing-specs → 每任务 TDD → fresh review → verifying-ui → 落地报告。

判断有没有改善，可与同类任务不用该工作流的基线对比，记录：是否在写代码前产出并批准 spec；每个任务是否有“失败测试→通过”的记录；ledger 是否记录关键判断；是否只做一次 fresh review；UI 验收的 pass/reject 轮次和返工次数；人工干预次数，尤其是是否频繁被问“should I continue”；最终落地方式是否符合选择。若 spec 前置、红绿测试、UI 验收和复审减少了返工与遗漏，同时没有显著增加人工协调成本，再考虑扩大使用范围。
