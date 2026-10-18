# Show HN: Sphinx – A hook that quizzes you on your AI's code before shipping

- 结论：**值得一试**。可以在非关键的 Git 仓库里安装 Sphinx 跑一遍完整流程（npm install -g sphinx-understand → sphinx install → git push 并在被保护分支上回答提问），因为它把「提交前是否真的理解 agent 写的代码」做成了一个有安装命令和明确触发点的可执行检查；但原文只有产品页级说明、示例对话还自标为虚构，且是刚发布的 Show HN 项目，所以只适合小范围试，不建议直接写进手册。
- 原文：https://sphinx-six-theta.vercel.app/
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T07:07:17.214Z

## 是什么

Sphinx 是一个 Git hook，面向 agent 辅助开发：在 agent 生成的代码被 push（尤其是受保护分支）之前，它会读你的 diff，向你提一个关于「这段改动在出问题时会发生什么」的问题；答对才放行 push，答错会解释原因并让你换一个场景重试。

它的口号是 "Outsource your thinking, not your understanding."。原文自述的运行方式是：由一个从没看过你聊天记录的审查者读 diff 并提问，提问用的模型可以从你现有的编码 agent、OpenRouter 或任何 OpenAI 兼容端点来，且「built to run on minimal tokens」。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提**：Node 22.19+，系统为 macOS、Linux 或 WSL（原文未提 Windows 原生）。

2. **全局安装**：
```
npm install -g sphinx-understand
```

3. **在仓库里初始化，连接 Git 与你的编码 agent**（会问你用哪个模型来审查）：
```
sphinx install
```

4. **正常推送**，在被保护的分支上 Git 会暂停：
```
git push
```

5. **回答 Sphinx 的提问**。原文流程是三步：01 你（或你的 agent）push；02 Sphinx 读 diff 提问，针对「改动出错时会发生什么」；03 你回答——答错它会解释为什么，然后换一个新场景再问；答对 push 继续。

6. **应急放行**（原文给出的逃生阀，每次跳过都会记录日志）：
```
sphinx yolo
```

7. **模型后端可选**：你的现有编码 agent、OpenRouter，或任何 OpenAI 兼容端点。原文声称兼容 Codex、Claude Code、Cursor、OpenCode、Pi，或纯 Git。

8. **隐私边界（原文明确声明）**：你的回答不会传给编码 agent；`.env` 文件和密钥「never opened」。更多配置原文指向其文档（"Read the docs for everything else"），本文未提供。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：Sphinx 把「检查人是否理解代码」本身当成一件可以交给 AI 做的事——AI 在这里不写代码，而是当出题人和判卷人（依据原文 01–03 的流程图描述）。这是通常不会想到交给模型的角色。
- **任务匹配**：审查模型可以复用你已有的编码 agent，也可以走 OpenRouter 或任意 OpenAI 兼容端点；原文强调「built to run on minimal tokens」，说明作者认为「读 diff + 提问 + 判断答案」属于可低成本模型承担的任务，不必用最强模型。
- **条件供给**：需要给 Sphinx 的东西包括——一个 Git 仓库和受保护分支、Node 22.19+ 运行环境、一次 `sphinx install` 并选定审查模型；输入是 diff 本身。权限上原文划了边界：不读 `.env` 和密钥，回答不回流给编码 agent。
- **主动推进**：属于**事件触发**——由 `git push` 触发自动暂停与提问，不需要人记得去做；`sphinx yolo` 的每次跳过会被记录，说明它把「绕过」也留成可追溯的事件。
- **效果验证**：原文没有给出任何效果度量指标（没有误判率、没有 token 实测、没有通过率）。唯一可用的信号是「答对才放行」这个硬门槛，以及被记录的跳过日志。

## 与已有做法的关系（对照给出的清单条目；没有就写「清单中没有相关条目」）

清单中相关条目有三个：Claude Code（adopt）、Cursor（watch）、OpenCode（watch）。原文明确说 Sphinx 可与 Claude Code、Cursor、OpenCode（以及 Codex、Pi 或纯 Git）配合使用。因此它不是这些工具的替代品，而是叠加在它们之上的**提交前验证层**：agent 负责写，Sphinx 负责在你 push 前确认你读懂了。清单里没有任何一条已经在做这件事。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的（可核对的）**：
- 安装与使用命令：`npm install -g sphinx-understand`、`sphinx install`、`git push`、`sphinx yolo`。
- 运行前提：Node 22.19+、macOS/Linux/WSL。
- 兼容列表：Codex、Claude Code、Cursor、OpenCode、Pi 或纯 Git；模型来源支持现有 agent、OpenRouter、任意 OpenAI 兼容端点。
- 隐私声明：答案不进入编码 agent，`.env` 与密钥不被打开。
- HN 上的热度：74 points、20 comments（评论正文未提供，无法判断社区评价内容）。

**只是作者主张、无数据支撑的**：
- 「minimal tokens」的具体消耗没有数字。
- 「提问质量足够好、能逼出真正的理解」没有评测数据。
- 没有误拦截率、漏检率、平均增加耗时、通过率等任何指标。
- 文中那段 Sphinx 与用户的对话**被明确标注为 "An illustrative exchange. Real questions come from your diff."**——即举例是虚构的，不能当作实测案例。

**适用条件与局限**：
- 需要 Node 22.19+，Windows 原生未提及。
- 是刚在 Show HN 发布的新项目（FOSS、Free），长期维护与稳定性未知。
- `sphinx yolo` 是全局逃生阀，存在被习惯性使用而架空检查的风险——原文说会记录日志，但没说是否强制可见或告警。
- 只对「你本人是否理解」有效，无法验证代码本身的正确性。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约几分钟）**：挑一个非关键的个人仓库，按上面 1–5 步走完一次：安装 → `sphinx install` → 让某个 agent（如 Claude Code）改一小段逻辑 → 在有保护的分支上 `git push` → 完整回答一次提问。先不要开 `sphinx yolo`，也不要接到团队主干仓库上。

**判断有没有改善的指标**（都是可在小范围自测的，不依赖原文未给的数据）：
1. **有效拦截率**：这次提问是否指向了 diff 里你原本没意识到的行为（每次 push 记 0/1，连续记两周）。
2. **提问质量**：把 Sphinx 的问题和答案人工打分（1–5），看它问的是「出问题时会发生什么」这类真问题，还是流于表面。
3. **跳过率**：`sphinx yolo` 的跳过次数 ÷ 总 push 次数。长期偏高说明阻力大于价值。
4. **时间成本**：每次 push 平均多花的分钟数。
5. **误判**：出现「你答对了却被判错」或「问题本身有误」的次数。
6. **模型开销**：审查模型的实际 token 花费，用来验证作者「minimal tokens」的说法。

只要 1 能稳定命中、4 和 5 可接受，就值得从个人仓库扩到小团队的一个非主干分支再观察；反之则退回人工 review。
