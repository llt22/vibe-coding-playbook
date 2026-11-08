# danyuchn/claude-work-mode

- 结论：**值得一试**。建议小范围试用：在 Claude Code 中安装 work-mode，先用 `auto` + `wrap` 约束可逆自主步骤和收尾决策，视需要再加 gates；理由是它给出了可安装的模式、闸门和配置，但效果目前只有 README/演示主张、缺少量化验证。
- 原文：https://github.com/danyuchn/claude-work-mode
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T12:48:56.674Z

## 是什么

这是一个 Claude Code 插件，用 slash command 切换会话级工作模式：

- `auto`：不因内部、可逆步骤停下来询问（本地文件、本地提交、测试）；硬停项（对外发送消息、安装、密钥、不可恢复删除、付款、权限变更、生产变更）进入 pending list，最后统一报告；会弹出确认提示的调用放到最后连续执行。
- `out`：把可由 checker 或 spot check 验证的批处理（抽取、分类、摘要、评审）交给后台 subagent 或外部 CLI，主线程负责验证；主线程一轮读了大量原始输出却没委派时，触发一次性 nudge。
- `wrap`：收敛，不开新分支，完成已打开事项，只列新增或变化的决策，每项带 label 和 recommendation。
- `off`：恢复正常。

模式按 session 生效，可组合；同时输入 `out` 和 `wrap` 时 `wrap` 优先。裸 `/work-mode` 打开多选 picker。README 称模式文本只在下次工具结果或 prompt 时送达模型一次，compaction 或 resume 后再送一次，因此不会每轮膨胀上下文。

可选的 `work-mode-gates` 把模式写入 `~/.claude/state/tempo/<session_id>` 供 shell hooks 读取，并通过 `tempo-auto.sh` 提供 `tempo_auto_on "$INPUT"` 和 `tempo_deny "<reason>"`。

## 具体做法

1. **确认前提**：需要 Claude Code 2.1.314 或更高版本并支持 function-hook plugins。若要安装 gates，还需要 `bash`、`jq`、`git`、`python3`。不满足时只考虑模式插件，不要装 gates。

2. **安装主插件**：
```
/plugin install work-mode --marketplace danyuchn/claude-work-mode
```
按提示回答 `y` 添加 marketplace，并选择 scope。

3. **按需安装 gates**：
```
/plugin install work-mode-gates --marketplace danyuchn/claude-work-mode
```
前提是第 1 步的 shell 依赖齐全。

4. **切换模式**：
```
/work-mode auto
/work-mode wrap
/work-mode auto wrap
/work-mode
```
`auto wrap` 适合需要自主推进但最后必须收敛列决策的会话；批处理任务可用 `auto out`。不要把 `out` 和 `wrap` 同时当作两个目标使用，因为 README 明确说两者同时出现时 `wrap` 胜出。裸 `/work-mode` 用于打开 picker。

5. **可选配置**：默认无需配置。要个性化时创建 `~/.config/work-mode/config.json`，或用 `WORK_MODE_CONFIG` 指向配置文件；字段示例可参考仓库的 `examples/config.example.json`。README 列出的关键字段包括：`locale`、`userName`、`pronouns`、`autonomous.extraRules`、`dispatch.pickerHint`、`dispatch.instructions`、`dispatch.commandPattern`、`dispatch.nudgeThresholdChars`、`dispatch.nudgeTemplate`、`dispatch.quotaFile` / `poolRouting`、`converge.sectionHeading`、`converge.decisionLabels` / `tradeoffLabel`、`converge.autoCloseCommand`。未配置时语言按 `WORK_MODE_LOCALE`、Claude Code `language` 设置、`LC_ALL` / `LANG` 顺序判断，否则英文。

6. **理解三个 gate 的行为**：
   - `scratch-doc-guard.sh`：PreToolUse `Write`，正常会先询问是否新建 `SUMMARY*/REPORT*/NOTES*/FINDINGS*/ANALYSIS*.md`；在 `auto` 下改为 deny，并告诉模型更新已有文档、使用 scratch dir 或直接在回复中回答。
   - `git-safe-commit-gate.sh`：PreToolUse `Bash`，正常会在带路径的 `git commit`（带或不带 `--`）以及 `git add <file>...` 但文件已有未暂存修改时询问；在 `auto` 下改为 deny，要求先用 `git add -p`，再执行普通 `git commit`。
   - `decision-label-guard.py`：Stop 事件，阻止决策区存在未加 label 的条目，或 tradeoff 条目没有说明双方各得到什么；在 `auto` 下行为相同。

7. **把硬停项留在 gate 之外**：README 明确建议只把希望被 `auto` 转换的检查放进 `tempo-auto.sh`；密钥、force push、部署等真正的硬停项应保持每次询问，不要转换。

8. **会话管理**：模式按 session 生效；模式文本只在下一步工具结果或 prompt 时送达模型，之后仅在 compaction 或 resume 后再次送达。需要新会话时重新切换模式。

## 对应的研究问题

- **能力发现**：有依据的部分是 `out` 模式明确建议把抽取、分类、摘要、评审等可由 checker / spot check 验证的批处理交给后台 subagent 或外部 CLI。这提供了一个“可委派任务”的具体判断口径，但不提供新的能力发现方法。
- **任务匹配**：给出了较具体的匹配规则：可逆内部步骤用 `auto`；可验证批处理用 `out`；需要收敛和列决策用 `wrap`。另外 `dispatch.commandPattern` 默认把 `codex exec`、`gemini`、`claude -p` 视为委派命令，可用于判断什么算外部 CLI 委派。
- **条件供给**：需要安装插件、满足 Claude Code 版本和 shell 依赖；gates 依赖 `bash`、`jq`、`git`、`python3`；模式状态写入 `~/.claude/state/tempo/<session_id>`；可选配置文件提供用户称呼、额外规则、委派命令模式、nudge 阈值、决策 label 等。
- **主动推进**：`auto` 让模型不因可逆步骤停下来询问，并把硬停项集中到最后报告；`out` 在主线程读取大量原始输出而未委派时触发 nudge。这是会话内的“持续完成”机制，但材料没有提供按时间、事件或状态自动调度任务的机制。
- **效果验证**：`wrap` 要求列出新增或变化决策并附 label 和 recommendation；`decision-label-guard.py` 会阻止未加 label 的决策条目和未说明双方收益的 tradeoff。这能验证“决策是否被完整表达”，但材料没有给出任务结果层面的验证指标。

## 与已有做法的关系

清单中只有 **Claude Code**（tool，adopt）。本条目是 Claude Code 的插件和工作模式层扩展，不替代 Claude Code，而是在其会话内增加自主推进、委派和收敛的控制方式。清单中没有其他相关条目。

## 证据与局限

- 材料只有仓库 README，没有源码、测试内容或 demo 的文字转写；README 提到 60 秒演示视频，但输入中没有视频内容。
- 给出的可执行内容包括安装命令、模式命令、gates 行为和配置字段，足以做小范围试用。
- 效果主张主要是作者陈述：模式文本不会每轮膨胀上下文、三种模式会改变行为、gates 能把“询问”转成“deny 并继续”。没有量化数据、对照实验或案例结果。
- gates 会强制拒绝某些行为，可能带来摩擦：新建文档的 guard 可能拒绝合理的报告文件；git gate 会要求改用 `git add -p`；decision-label guard 只检查 label 和 tradeoff 表述，不保证决策质量。
- 适用条件明确：仅限 Claude Code，且需要较新的 function-hook 支持；gates 还需要 shell 工具。README 也提醒真正的硬停项不应被 `auto` 转换。

## 怎么试、怎么验证

1. 在隔离仓库或沙箱中试用，准备两类任务：一类是本地可逆修改加测试，另一类是有 checker 的批处理（抽取、分类、摘要或评审）。
2. 先记录不用插件的基线：完成时间、确认提示次数、返工次数、是否出现误提交或多余文档、最终决策是否完整。
3. 安装 `work-mode`，对本地可逆任务使用 `/work-mode auto wrap`；对可验证批处理使用 `/work-mode auto out`。先不安装 gates，观察模式本身的行为。
4. 再逐个启用 gates：先在沙箱验证 `scratch-doc-guard.sh` 和 `git-safe-commit-gate.sh`，再验证 `decision-label-guard.py`。每启用一个 gate，记录它拒绝的请求是否合理、是否造成额外返工。
5. 判断改善时看任务结果和安全事件，不要只看提示次数：硬停项是否仍被正确报告、是否发生未授权操作、是否减少可逆步骤的打断、批处理是否被正确委派并由主线程验证、是否减少多余文档和需修复的提交、`wrap` 的决策列表是否完整且 label 正确。
6. 若 gate 频繁拒绝合理操作或导致返工，先调整配置或停用对应 gate；只有在任务结果不差于基线、硬停项没有被绕过时，才考虑扩大使用范围。
