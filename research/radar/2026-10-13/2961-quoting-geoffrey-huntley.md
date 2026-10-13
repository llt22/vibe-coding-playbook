# Quoting Geoffrey Huntley

- 结论：**值得一试**。把架构约束从 AGENTS.md 这类提示文件搬到 pre-commit hook：提交时检查 git diff，发现绕过内部库（如 diagnostics 模块）的调用就让提交失败，并把纠正指令写进失败输出、交给编码智能体自纠。理由是把“靠提醒”变成“事件触发的强制门禁”，避免规则随上下文漂移；但原文只有一段口述、没有代码与量化数据，需自行补齐实现后小范围验证。
- 原文：https://simonwillison.net/2026/Oct/13/geoffrey-huntley/
- 来源：rss:src-simon-willison-blog，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T15:40:52.941Z

## 是什么

这是 Simon Willison 博客上收集的一条引言（2026-10-13），出自 Geoffrey Huntley 的文章《nobody should type code by hand anymore. here's what's left.》。原文完整内容如下：

> If the agent isn't using my diagnostics library, I could introspect and update AGENTS.md, but there's still a delta, and it'll drift. Instead, I write a pre-commit hook that checks the git diff for direct calls to observability modules that bypass my diagnostics module. Boom: fail the commit, inject a prompt telling the agent to use the diagnostics library. All of a sudden it's ten out of ten.

要点拆开是三条：

1. 智能体不按约定使用内部库（diagnostics 库）时，靠改 `AGENTS.md` 这类指令文件不管用——作者说“仍有落差，而且会漂移”。
2. 改用 pre-commit hook：检查 `git diff` 里是否有直接调用 observability 模块、绕过 diagnostics 模块的写法。
3. 有违规就 fail 掉这次提交，并把“请使用 diagnostics 库”的提示注入给智能体；作者称效果立刻变成“ten out of ten”。

本质是一个通用模式：**用提交时门禁代替文档提醒，并把门禁的失败信息当作反馈通道喂回给智能体**。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提说明：原文只给了思路，**没有给出任何 hook 代码、匹配规则、提示词原文或仓库配置**。以下步骤严格按原文描述的顺序还原；第 2–4 步的具体实现需要在你的仓库中自行编写，标为“原文未给出”。

1. **选定一条“可判定”的硬约束。** 原文的例子是“不允许绕过 diagnostics 模块直接调用 observability 模块”。前提：这条约束必须能被 diff 文本的模式匹配判定，而不是“代码写得好不好”这类主观标准。

2. **编写 pre-commit hook，读取已暂存的 git diff。**（原文未给出实现）在仓库的 `.git/hooks/pre-commit` 或 pre-commit 框架配置中，取 `git diff --cached` 的文本作为输入。前提：仓库已有可用的 git hook 机制，且智能体的改动会经过正常 `git commit` 流程。

3. **用模式匹配找出违规调用。**（原文未给出实现）针对第 1 步的约束，匹配“直接调用 observability 模块”的写法。示意结构如下——**这不是原文给出的代码，只是把原文描述落成骨架**：

   ```sh
   #!/bin/sh
   # 示意骨架，原文未提供实现
   RULE_PATTERN='<绕过 diagnostics、直接 import/调用 observability 模块的模式>'
   diff=$(git diff --cached)
   if printf '%s' "$diff" | grep -Eq "$RULE_PATTERN"; then
     echo "提交被拒绝：检测到绕过 diagnostics 库的直接调用。"
     echo "请改用 diagnostics 库的接口重写上述调用后再次提交。"
     exit 1
   fi
   ```

4. **失败时非零退出，并在输出里写进给智能体的纠正提示。** 这一步是原文的核心机制：hook 的失败输出就是智能体看到的反馈，等于“inject a prompt”。前提：智能体处在“改代码 → 提交 → 读失败输出 → 再改”的循环里，能读到 hook 的 stdout/stderr。注意原文用的是 “inject a prompt” 这个说法，**并未说明注入是走 hook 输出还是走某个 agent harness 的接口**，这里需要按你的工具链确认。

5. **让智能体重跑直到提交通过，而不是人去手工改。** 门禁失败 → 提示注入 → 智能体改写 → 再提交，循环收敛。

6. **把规则本身当作代码来维护。** 因为规则写在 hook 里（显式、可版本化、可 review），而不是散在 `AGENTS.md` 的散文里，所以不会像指令文件那样“漂移”。规则变更时同步更新 hook 与匹配模式。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **1. 能力发现：** 原文展示了一件原本没想到交给自动化的事——“让智能体遵守内部库约定”本来靠人 review 或靠提示文件，现在可以交给提交时门禁 + 智能体自纠来完成。
- **2. 任务匹配：** 适配对象是编码智能体，且必须运行在“有提交动作、能读到命令失败输出”的协作方式里；配套工具是 git pre-commit hook。原文未讨论其他模型或工具。
- **3. 条件供给：** 需要三样东西——(a) 一条能被模式匹配判定的规则；(b) hook 能拿到 diff 文本；(c) 智能体能读到 hook 的失败输出（即反馈通道必须打通）。原文未提及权限、模型上下文等其他供给条件。
- **4. 主动推进：** 属于**事件触发**：以“提交”这一事件触发检查，不需要人或智能体记得主动执行，也不需要定时任务。
- **5. 效果验证：** 原文只给了一句主观评价 “it's ten out of ten”，没有任何指标、对照或数据。可操作化的验证方式见本报告最后一节。

## 与已有做法的关系

清单中没有相关条目。原文提到一个可对照的“已有做法”是 **AGENTS.md**（智能体指令文件）：作者认为它的问题是存在“delta”（指令与实际做法之间的落差）并且会漂移，因此才改用 hook 方案。这个对照是原文自己的，不在项目清单中。

## 证据与局限

**原文给出的：** 一段第一人称的做法描述（谁：Geoffrey Huntley；做什么：写 pre-commit hook 检查 diff；触发条件：直接调用 observability 模块绕过 diagnostics 模块；动作：fail commit + 注入提示）。以及一个对照判断：改 AGENTS.md 会有 delta 且漂移。

**只是作者主张、没有证据的：**
- “there's still a delta, and it'll drift” —— 对指令文件失效机制的断言，无数据。
- “All of a sudden it's ten out of ten” —— 主观评分，未定义“十分”是什么、如何测量、有无对照。

**原文完全没有的：** hook 代码、匹配模式、提示词原文、误报率、团队规模、项目类型、时间跨度。

**适用条件：** 项目里存在清晰、可被文本模式判定的架构约束；使用 git 且有 pre-commit 机制；智能体运行在提交—失败—修正的循环中。

**局限：** 模式匹配必然有误报和漏报；规则固化在 hook 中意味着每次放宽/收紧都要改代码；对“没有唯一正确写法”的约束（如命名风格、抽象设计）不适用；hook 输出如何被智能体接收，依赖具体工具链，原文未交代。

## 怎么试、怎么验证

**最小试用方式：**
1. 挑一条团队在 code review 中反复提出的硬约束（不必是 diagnostics 库，任何“禁止 X，必须走 Y”的规则都行）。
2. 写一个 pre-commit hook 检测违规，失败输出中写明“应改成什么”。
3. 让智能体在正常提交循环里工作一周，不要额外在 `AGENTS.md` 里重复这条规则。

**建议的对照：** 同一约束、同一类任务，分两组跑——A 组只靠 `AGENTS.md` 提示，B 组用 hook 门禁 + 失败提示注入。

**判断有没有改善的指标：**
- 违规提交率：hook 触发次数 / 总提交次数，看是否随时间下降（智能体是否真的学会了）。
- 首次提交即通过的比例：反映反馈是否有效，而不是反复来回。
- 每次触发后需要的修复轮数：轮数少说明提示写清楚了。
- 人在 review 中提出同类问题的次数：这是最终的业务指标，直接对应“省了多少人工”。
- 误报次数：如果频繁误报，说明规则的模式化程度不够，应先修规则再判断方案价值。

**判定：** 若 B 组违规提交率下降、人工 review 同类评论减少、误报可控，则说明该做法有效，可写进手册；若 hook 频繁误报，或智能体读不到/读不懂失败输出而无法自纠，则说明问题出在“规则可判定性”或“反馈通道”，需要先修这两个前提再谈收益。
