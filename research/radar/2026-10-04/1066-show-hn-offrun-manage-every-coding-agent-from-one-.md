# Show HN: Offrun – manage every coding agent from one workspace

- 结论：**值得一试**。先在单个有 git 的仓库上小范围试三条可迁移流程——每个 agent 一个 worktree、项目记忆落成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做评审——再决定是否长期用 Offrun 本身；理由是这几条流程具体、可照做且不依赖工具存活，而 Offrun 自身的收益（限额自动切换、全 Mac 通知、免费无限）目前只有厂�自述，且限定 Apple Silicon Mac。
- 原文：https://offrun.dev/
- 来源：hn，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T16:59:53.158Z

## 是什么

Offrun 是一个 macOS 桌面应用（Apple Silicon M1 或更新、macOS 14 Sonoma 或更高），把你已经在用的编码 CLI 智能体集中到一个工作区里运行：Claude Code、Codex、AGY、Grok Build，Pi 和 OpenCode 标注为 coming soon。

它不替代这些 CLI，而是作为宿主运行它们：用你自己的账号登录、走你自己的订阅，原文明确说 Offrun 没有服务器在请求路径上、不经手你的密钥。原文称免费、全部功能、无限制、无信用卡。

除集中管理外，它提供的是一组多智能体工作方式：每个 agent 一个 git worktree、另一个 agent 做提交前同行评审、撞到用量限额时把对话迁到另一个登录、项目记忆写成项目文件夹里的纯文件、全 Mac 范围的 agent 通知、Build/Planner 两种模式、本地听写。

## 具体做法（编号步骤）

前提（原文明确写出）：Apple Silicon Mac（M1 或更新）+ macOS 14 Sonoma 或更新 + 至少一个你已在使用的 agent CLI + 你自己的 agent 账号（有第二个账号更好）。免费、无需信用卡。

1. 安装：下载 Offrun，拖进 Applications。
2. 连接 agent：Settings → Agents，添加账号；有第二个账号也一并添加。页面示例里的账号是 Claude Code（Default、Work 两个）、Codex（用 ChatGPT 登录）、AGY（用 Google 登录）、Grok Build（用 X 登录）。
3. 起一个 agent：选一个项目，给它一个任务。
4. 让每个 agent 拿到独立 worktree：项目里的每个 agent 都有自己的 git worktree，同一 repo 的两个 agent 不会碰同一批文件。可以同时跑重构和修 bug，各自分支，按你自己的节奏合并。（前提：项目本身在 git 下。）
5. 建立项目记忆（原文给了文件名和读写时机）：在项目文件夹里存纯文件，可打开、可编辑、可提交，
```
conventions.md   # 仓库级约定，每个 agent 都读
plan.md          # 这个功能的做法
dead-ends.md     # 试过、失败、记下来
```
agent 在每次会话开始时读这些上下文，在工作中写回。原文的意图是：第四个会话知道第一个会话已经试过什么。
6. 让第二个 agent 做提交前评审：挑一个 reviewer，它的发现在工作还没提交时就直接落到 chat 里；你可以让它按意见改，改动落到你的消息框里由你读，原文强调“Nothing merges on its own”。示例输出（原文给的形态）：
```
Review by Codex · changes requested
1. Warning in src/retry.js:2
   The 30 second cap is longer than the gateway's 25 second timeout,
   so the last retry is cut off.
```
7. 撞限额时切换登录：给不同 agent 指向不同登录；某个登录到限额后，Offrun 把 chat 移到还有余量的登录并告知；你重发消息，新登录接续整段对话；没有可用登录时它提议换另一个 agent。原文示例文案：“Claude Code resets 3am. Codex can pick up this chat. It gets the whole conversation.”
8. 按需要切换模式：Build —— 做出改动并运行以证明它能工作；Planner —— 只想出做法并写下来，不改任何文件。任意 chat 可随时切换。
9. 开通知：Offrun 监听 Mac 上任何位置的编码 agent，包括它没启动的终端里的；agent 完成或停下来提问时通知你。原文示例：“Codex needs your approval — Run npm install in billing-svc”“Claude is waiting — Shall I push the tag for 2.4.0?”
10. 在 chat 旁边读产出：改动文件、带行号的 diff、渲染后的 markdown 和表格、图片、PDF，还有一个小浏览器。
11. 听写（可选）：按住键说话，本机转写，按你代码的拼写纠正术语；可以针对词条加 voice sample（示例：mac book→MacBook、jason→JSON、retry backoff helper→retryBackoffHelper、Kubernetes）。原文称转写完全在本机、不录音不上传。

数据边界（原文有一张明示表）：留在本机的是听写和项目文件；memory、chats、worktrees 在项目文件夹里；离开本机的是 agent 提示词和代码，直接发往你自己的 Anthropic / OpenAI / Google / xAI 账号；Offrun 服务器不在路径中。

## 对应的研究问题

1. 能力发现：把“提交前先读一遍 diff”这一步交给第二个 agent（原文示例抓的是跨文件约束：30 秒重试上限长于网关 25 秒超时，导致最后一次重试被截断）；把“记住试过什么”交给 dead-ends.md 这类文件而不是靠对话历史长度。原文没有提到更多“还没想到交给 AI”的能力。
2. 任务匹配：需要“证明能跑通”的改动对应 Build 模式；只需要方案、不许动文件对应 Planner 模式；reviewer 由你自己的模型选择器指定；限额切换时由另一个 CLI 接管整段对话，即跨模型/跨订阅的对话接续。原文把 peer review 明确跑在“你自己的某个 agent 账号”上，不额外订阅、不在 PR 上放 bot。
3. 条件供给：需要装 App、至少一个已在用的 CLI、你自己的账号登录（多账号更好）、项目在 git 下（worktree 依赖 git）、项目文件夹里三个记忆文件；权限与密钥不经过 Offrun；反馈通过 chat 内的 diff/预览和系统通知回传。
4. 主动推进：原文只写了“agent 完成或停下来提问”触发通知这一类事件触发。没有描述由时间、状态或任务链自动推进的工作，限额切换也需要你手动重发消息。
5. 效果验证：原文给的是界面里的运行对照表和 agent 自述——“Before the fix 41 of 50 / 9 failed，After the fix 50 of 50 / 0”，“It passed 50 runs in a row”。这些是演示数据，不是对 Offrun 自身效果的度量。

## 与已有做法的关系

清单中有 Claude Code（tool，adopt）、Cursor（tool，watch）、OpenCode（tool，watch）。

- Claude Code：Offrun 不替代它，而是在其中运行它（原文 FAQ 明确“No. It runs them.”）。所以是叠加在已 adopt 的 Claude Code 之上的一层（隔离、评审、账号切换），不是替换方案。
- OpenCode：原文明确列为 coming soon，目前还不能用 Offrun 管理。
- Cursor：原文未提及。Offrun 面向 CLI agent，Cursor 是 IDE，二者不在同一层。
- 原文另外提到的 Codex、AGY、Grok Build 在清单中没有对应条目。

## 证据与局限

原文给出的：三步骤安装流程、各 agent 的登录方式、同行评审的具体评论文本、限额切换的提示文案、50 次运行的对照表、数据边界表。这些都是产品页面上的交互级演示。

只是作者主张、没有外部验证的：

- “50 runs in a row”“41 of 50 → 50 of 50”是页面演示，不是可复现评测。
- 免费无限、无服务器、不经手密钥，均为厂商声明，原文未给审计或第三方说明。
- 无版本号、无发布日志、无第三方用户案例；HN 上 51 分、23 条评论的讨论内容不在给定材料里。

适用条件写得很明确，也比较窄：Apple Silicon（M1+）、macOS 14 Sonoma 或更高、至少一个已在用的 agent CLI。跨 Mac 通知、本地听写等只在 macOS 生态成立。Pi 与 OpenCode 尚未支持。

材料质量问题：抓取到的文本夹有站点源码注释（编码声明位置、tab 标题长度取舍、以及“demo 账号是编造的、别在页面上放真实地址或登录名”的开发备注），页面示例里的 sam@studio.dev / sam@acme.co 是占位账号。这些是页面开发注释，不是给用户的操作说明，本报告未把它们当作步骤。

## 怎么试、怎么验证

最小试用（半天到一天，一个仓库）：

1. 在一台符合条件的 Mac 上装好，接两个你已有的 agent 账号（至少 Claude Code 加另一个），挑一个有 git、且有能跑的测试的 repo。
2. 别一次全上，只试两件事：
   - 隔离：同一 repo 同时开两个任务（一个重构、一个修 bug），确认两个 worktree 不互相改文件，各自分支能分别合并。
   - 记忆：手工建 conventions.md / plan.md / dead-ends.md，把仓库约定和不许再试的死路写进去；开第二个会话时确认 agent 是否真读了，以及失败尝试是否被写回 dead-ends.md。
3. 再试同行评审：让另一个 agent 在提交前读 diff，重点看它能不能抓到跨文件的数值/契约冲突（如上限与上游超时不一致这类）。

判断有没有改善的指标（都要和“你现在单 agent 终端流程做同样任务”对照）：

- 并行任务时文件互相覆盖/冲突的次数（期望 0）。
- 第二个同类会话的返工量：是否还要重复解释约定、是否重复踩 dead-ends 里已有的坑。
- 同行评审提出的问题里，你判断有效（会改）的比例，以及误报率。
- 撞到用量限额导致的等待时间是否下降（切登录后能否无缝继续）。

止损条件：只在一个 repo、一两个任务上观察两周再决定是否推广；记忆是纯文件、chat 和 worktree 都在项目文件夹里，退回现有流程没有迁移成本。
