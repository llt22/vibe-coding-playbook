# SamueleBassoli/hermes-fleet-apps

- 结论：**值得一试**。建议小范围试：先用 Hermes Agent 搭 coordinator、coder、qa 三个角色，在 Windows/Python 本地小工具上跑通两道人审门和绿灯合并，再决定是否扩到七角色；理由是 README 给出了可操作的编排规则，但缺少完整配置与跨平台/非 Python 证据。
- 原文：https://github.com/SamueleBassoli/hermes-fleet-apps
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T12:22:28.689Z

## 是什么
这是 SamueleBassoli/hermes-fleet-apps 的 README，描述一个基于 Hermes Agent 的七角色 fleet 模板：协调者、产品、设计、编码、QA、媒体、文档，面向一个人把本地 Python 桌面应用、CLI 和小型本地 Web UI 从想法做到安装包和发布。每个角色是一个 SOUL.md 加技能，复制到自己的 Hermes profile。README 只给高层流程和规则，详细采用步骤在 docs/adopt.md，交接规则在 docs/handoff-rules.md，第三方技能清单在 docs/third-party-skills.md，但这些正文未提供。

## 具体做法
前提：已安装 Hermes Agent；有一个代码仓库作为项目状态载体；按 README 的 tested on 条件，先在 Windows + Python + 本地小工具上试。README 没有给出可直接复制的命令、SOUL.md 内容或提示词，以下步骤依据其文字整理，具体命令需按 docs/adopt.md 执行。

1. 为每个角色创建独立的 Hermes profile。
2. 从 roles/<role>/ 复制该角色的 SOUL.md 和 skills/ 到对应 profile；先只启用 coordinator 和 coder，下一步再加 qa。
3. 用 coordinator 接收想法并拆成任务，按流程路由给产品、设计、编码、QA、媒体、文档。
4. 设置两处人工审批门：产品写完 spec 后由你批准；设计写完视觉方案后由你批准。其余阶段自动推进。
5. 任何公开发布动作（push、tag、post）和任何凭据都必须等待你处理；不要让 agent 读取、复制或打印密钥，只让它告诉你填哪个文件和变量。
6. 强制规则：QA 独立运行构建、审查代码和安全、复现 bug，但不改代码，只写 QA-REPORT.md 和 punch-list；coder 负责修复。只有测试全绿才允许合并，红测中止合并。
7. 只有 coordinator 规划任务和创建卡片；worker 只在自己的报告里写后续事项。
8. 项目状态只放仓库，不放 agent 记忆；每个任务结束清理临时文件、测试输出和残留服务，并说明清理了什么。
9. 当任务上下文被压缩两次后，写 handoff 并停止，让新会话从文件而不是模糊对话继续。
10. 按 README 的短版采用路径：先 coordinator + coder，再加 qa；需要设计/媒体/文档时再扩到七角色。

README 给出的主流程原样如下：

```
idea
 -> product      writes the spec
 -> [gate: you approve the spec]
 -> designer     writes the visual plan
 -> [gate: you approve the design]
 -> coder        builds it, with tests
 -> qa           checks it, independently
 -> media + docs videos, README, release notes
 -> release
```

## 对应的研究问题
- 能力发现：README 明确让 AI 承担产品 spec、视觉方案、编码与测试、独立 QA、媒体素材和文档发布文本等角色，说明这些工作可被拆给专门 agent。
- 任务匹配：用 coordinator 做路由和检查，product 写 SPEC.md，designer 产出 .design/，coder 负责架构、代码、测试、CI、git，qa 只检查不改代码，media 产 GIF/视频，docs 产 README、changelog、release notes。README 还说明 tested on 为 Python 本地应用，非 Python 栈未测试。
- 条件供给：需要 Hermes Agent、每个角色的 profile、SOUL.md、skills/、仓库内项目状态、交接规则文档；第三方技能要从来源安装；凭据由人填写，公开发布动作由人批准。
- 主动推进：两处人工门之后，coder、qa、media、docs 可自动推进，coordinator 在阶段完成或真正阻塞时报告；公开发布和凭据始终等待人；上下文压缩两次后写 handoff 并由新会话继续。
- 效果验证：用测试全绿作为合并门槛，QA 独立跑构建并输出 QA-REPORT.md 的 pass/fail 和 punch-list，coordinator 检查各角色交付；README 未给出量化结果指标。

## 与已有做法的关系
清单中有 Hermes（tool，watch）。该仓库是 Hermes Agent 上的多角色 fleet 模板，直接依赖 Hermes；因此与该条目相关，但清单没有针对 fleet 编排模板的独立条目。Hermes 仍为 watch，说明底层工具本身尚未到可直接采用的成熟度。

## 证据与局限
README 给出了角色表、主流程、两处审批门和七条经验规则； tested on 为 Windows、Python、桌面应用、CLI、小型本地 Web UI，由一个人从想法做到安装包和发布； not tested 为 macOS/Linux、带服务器/账户/支付的在线服务、移动应用、非 Python 栈。没有量化数据、案例结果或对比实验；多数规则是作者设计主张。第三方技能不在仓库内，需要从来源安装。README 未提供 SOUL.md 内容、adopt.md 细节和命令，无法据此完整复现。因此最多小范围试，不建议直接采用。

## 怎么试、怎么验证
最小试用：选一个 1-2 天可完成的 Python CLI 或本地小工具；只启用 coordinator、coder、qa，可选 product 先写 SPEC.md。要求产出 SPEC.md、代码与测试、QA-REPORT.md。设置 spec 审批门；公开发布和凭据仍由人处理。跑 2 个任务，记录：人工介入次数是否集中在审批门和公开/凭据；红测是否阻止合并；QA 在发布前发现的可复现问题数；返工轮次；从想法到可运行安装包的时间；是否出现密钥进聊天、残留进程、状态只存在对话里等事故。改善判断：与你自己此前同类小工具相比，发布前缺陷更少、返工更少、人工介入更少且没有安全/清理事故，才考虑扩到设计、媒体、文档和更多角色。
