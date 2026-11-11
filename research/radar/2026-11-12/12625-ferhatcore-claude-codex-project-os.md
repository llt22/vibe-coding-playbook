# ferhatcore/claude-codex-project-os

- 结论：**值得一试**。建议小范围试：先用示例工作区跑通 PM→Developer→QA→人工审批，再在一个低风险仓库用共享任务文件做 1–2 个真实任务；它给出了可复制的安装命令、角色分工和验收流程，但材料只有 README 且无效果数据，暂不宜直接 adopt。
- 原文：https://github.com/ferhatcore/claude-codex-project-os
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T20:06:07.681Z

## 是什么
这是一个面向 Claude Code 和 Codex 的项目工作区骨架：用任务文件、决策记录、仓库规则和 PM/Developer/QA/Reviewer 四类角色，把“分配任务—开发—QA 验收—人工审批”固定成流程。PM 记录决策、写任务并分派；开发者改代码；QA 在回到人工审批前按任务逐条检查结果；进度保存在文件里，新会话可继续而不用重新解释背景。两个客户端共享同一套 planning 目录、任务文件、决策和仓库规则，可以在步骤之间切换客户端而保持项目状态在一处。安装后 Claude Code 得到 `CLAUDE.md`，Codex 得到 `AGENTS.md`、项目 skills 和四个角色定义；`.project-os.json` 记录 runtime、仓库列表、worker cap 和模型偏好。示例是本地阅读清单 Trailboard，含小 CLI、手册和一个待做的状态过滤任务。

## 具体做法
1. 前提：安装 Node.js 22 或更高版本，并准备好要用的 Claude Code 或 Codex。README 说明无需安装 npm 包。先克隆仓库：
```sh
git clone https://github.com/ferhatcore/claude-codex-project-os.git
cd claude-codex-project-os
```
2. 用初始化脚本生成新工作区。目标目录必须是新的；安装器不会改动已有仓库和全局客户端设置。三种运行方式：
```sh
node scripts/init.mjs --target ../claude-demo --example --runtime claude
node scripts/init.mjs --target ../codex-demo --example --runtime codex
node scripts/init.mjs --target ../shared-demo --example --runtime both
```
用于自己的项目时去掉 `--example`，并用 `--name` 指定项目名。
3. 在客户端中打开生成目录，要求它读取 `START.md`；在 Codex 中也可以调用 `$project-os-start`。
4. 先跑示例，确认生成的工作区可用：
```sh
node repos/catalog/catalog.mjs
node --test repos/catalog/catalog.test.mjs
```
5. 建任务时写清 repository、scope、branch、acceptance criteria 和 permissions。工作会话要记录改了什么、检查了什么、从哪里继续。QA 要独立核验每条验收标准；如果范围变化，先改任务再继续。
6. 按 README 的流程设置审批门：人给出范围与批准 → PM 写任务和计划 → Developer 修改 → 如需要则安全审查 → QA 验收 → PM 检查完整性 → 人工批准 Git 操作 → 部署作为单独决策。同一仓库同一时间只允许一个 writer，包括在 Claude Code 和 Codex 之间切换时。代码获批不等于 commit、push 或部署获批。安全审查与 QA 合计最多两轮失败循环；第三轮需要新计划与人工批准。
7. 检查生成的 `.project-os.json`：其中记录所选 runtime、仓库列表、worker cap 和模型偏好。worker cap 可选 `lean`、`standard` 或 `heavy`；模型 tier 默认继承当前活动模型，直到映射到账户中可用的设置。README 没有给出该 JSON 的完整样例，实际以生成文件为准。
8. 若要验证安装器本身，可运行：
```sh
node scripts/check.mjs
node --test scripts/system.test.mjs scripts/smoke.test.mjs scripts/runtimes.test.mjs
node --test examples/trailboard/repos/catalog/catalog.test.mjs
```

## 对应的研究问题
- 能力发现：它把 PM 任务拆解与分派、Developer 代码修改、QA 独立验收、Reviewer/安全审查拆成可分配角色；还支持把进度写入文件，让新会话接着做。是否自动委派取决于客户端，不能自动选择角色时由 PM 在委派说明中带上该角色的完整指令，手动会话是回退方案。
- 任务匹配：同一工作区可选 Claude Code、Codex 或两者共用；Codex 使用可用的原生委派工具；worker cap 分 lean/standard/heavy，模型偏好放在 `.project-os.json`。适合需要多角色、多仓库和人工审批的编码任务，而不是所有轻量任务都值得套这套流程。
- 条件供给：需要提供共享 planning 目录、任务文件、决策记录、仓库规则、`START.md` 以及客户端入口文件；任务必须写明仓库、范围、分支、验收标准和权限；还需要人工审批、QA 独立检查和“一仓库一 writer”的约束。README 明确说安装器本身不启动 agent、不发模型请求。
- 主动推进：进度存在文件中，新会话可以从记录处继续；任务按“PM→开发→审查/QA→PM 完整性检查→人工批准”的状态链推进，范围变化要先改任务。README 没有给出按时间或事件自动触发任务的机制，因此这里主要是状态驱动的续做和审批门，而不是自动调度。
- 效果验证：QA 按验收标准逐条独立核验，PM 再检查完整性，人工批准 Git 操作；安全审查与 QA 的失败循环有上限。仓库还提供安装器检查命令，并声称覆盖三种 runtime、三种 worker profile、共享任务状态、生成的角色文件、安装拒绝、配置和 fixture 行为；但这些是工具自身检查，不等于业务效果验证。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）。本项目不是替代 Claude Code，而是在 Claude Code 和 Codex 之上增加任务文件、角色分工、QA 验收和人工审批层的流程骨架；已采用 Claude Code 的团队可以把它当作协作与验收模板。清单中没有 Codex、PM/QA 流程或 Project OS 的对应条目。

## 证据与局限
本次材料只有仓库 README，未包含 QUICKSTART、workflows、customization、troubleshooting、Codex verification record 等链接内容；GitHub 指标只有 54 stars。优点是给出了可复制的安装命令、生成目录、角色划分、任务字段、审批门和检查命令，具体性足以照做。局限是 README 没有量化效果数据、案例对比、返工率或时间节省数据，角色分工和 QA 收益主要是作者的设计主张；README 声称检查覆盖三种 runtime、三种 worker profile 和共享状态等，并称 GitHub Actions 在 Windows/Linux 的 Node.js 22 上运行测试，但本材料未展示运行结果或验证记录内容。适用条件是使用 Claude Code/Codex、Node.js 22+、目标目录全新、接受人工审批和单 writer 约束；安装器不会自动启动 agent 或发模型请求，客户端不能选择命名角色时需要回退到手动会话，模型 tier 也需要按账户能力映射。多角色和审批会增加流程开销，小任务未必划算。

## 怎么试、怎么验证
1. 先在临时目录用 `--example --runtime both` 生成示例工作区，跑 Trailboard 示例和 README 中的检查命令，确认安装、共享任务状态、角色文件和 QA 流程能走通。
2. 再选一个低风险、非关键仓库，用独立的新目标目录初始化，做 1–2 个有明确 acceptance criteria 的小任务；同时用团队现有流程做基线，记录同类任务的时间、返工和上下文重建成本。
3. 每个任务记录：新会话能否只读文件继续而无需重新解释；QA 是否在人工审批前独立发现不符合项；验收标准首次通过率；安全/QA 失败循环是否超过两轮；范围变更是否先改任务；是否出现未经批准的 commit、push 或部署；人工审批耗时。
4. 判断改善：任务文件能支撑跨会话续做，QA 能逐条给出证据，返工和重复解释减少，审批边界无事故，才考虑扩大使用。最小成功标准可设为：1–2 个任务都有验收标准和 QA 记录，未发生越权 Git/部署操作，且新会话无需重新解释背景即可继续；若流程开销明显大于收益、QA 只是形式检查，或角色委派无法稳定执行，则停止扩大。
