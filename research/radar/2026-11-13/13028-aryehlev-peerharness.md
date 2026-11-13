# aryehlev/PeerHarness

- 结论：**值得一试**。如果你使用 Claude Code 且团队有多条跨仓库的个人偏好规则要统一，就照着 README 的五步在单人环境下试一遍（用 `peerharness demo` 或真实纠正各走一次），再决定是否让第二个成员加入；理由是它给出了可照做的安装、试用、投票、治理命令，且纠正→规则→投票→下发整条链路都能跑通，但 v0.4.0 尚未审计、非沙箱、缺效果度量，暂不宜作团队强制标准。
- 原文：https://github.com/aryehlev/PeerHarness
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T01:55:54.597Z

## 是什么

PeerHarness 是一个在本地运行的“团队对 AI 编码智能体行为投票”的工具（v0.4.0，作者自述 early and not audited，31 stars，MIT 或 Apache-2.0 双许可）。它要解决的是：你在工作中纠正 agent（例如“用 pnpm，不要用 npm”），这条纠正通常只在当次会话有效；PeerHarness 把纠正固化成一句话规则，你可以自己留着，也可以提交给团队投票，过半数通过后规则作为 Agent Skill 自动装到每个成员的 agent 上，同时任何成员仍可在自己机器上对某条规则单独 opt-out。

架构上是无服务器（no server）：每人跑自己的 node，各自持有密钥、各自计票、各自验签，不依赖中心协调者，也没有投票截止时间。官方声明支持 Claude Code、Codex、Gemini CLI、Cursor、GitHub Copilot CLI、opencode、Pi、Google Antigravity、Qwen Code、Amp、Factory's Droid、Crush、Kilo、goose、DeepSeek Harness，其中只有 Claude Code 有 hook；其他 agent 只有在 agent 主动记录时，纠正才会被捕获。

## 具体做法

**第 0 步：确认前提**
- 平台：macOS 优先（README 说 Made for Claude Code on macOS first）；Linux 只能在终端使用，没有弹窗；Windows 不支持。
- 一个受支持的 agent，建议 Claude Code（唯一有 hook 的）。
- 需要 `curl`，安装脚本会做 SHA256 校验。

**第 1 步：安装（可以让 agent 执行）**
```bash
curl -fsSL https://raw.githubusercontent.com/aryehlev/peerharness/main/install.sh | sh
```
它会下载对应机器的 release 二进制，对照 release 的 `SHA256SUMS` 校验，装进 `~/.local/bin`。不需要 sudo，不改动其他东西。

**第 2 步：由你本人执行 setup（不能交给 agent，会被拒绝）**
```bash
~/.local/bin/peerharness setup
```
这一步用于授权“agent 可以替你启动什么”，所以必须由人执行。它生成你的密钥和数据库，把 PeerHarness 接到 Claude Code（两个 hook、一个 skill 及其工具），以及它找到的其他 agent；每处改动先显示再让你确认。

**存储前提（务必知情）**：其中一个 hook 会保存你输入每条 prompt 的脱敏副本，用来识别“纠正”。副本只在本机，默认保留 14 天，数据库不加密。

**第 3 步（可选）：把整段 setup 交给 agent（README 原文）**
```text
Set up PeerHarness for me: https://github.com/aryehlev/peerharness

1. Install it:
   curl -fsSL https://raw.githubusercontent.com/aryehlev/peerharness/main/install.sh | sh
2. The next step is mine. It is where I allow what you may start for me, so do not
   run it yourself: it would be refused. Ask me to run this in my own terminal:
   ~/.local/bin/peerharness setup

Then tell me to start a new session, and what I can ask you there.
```

**第 4 步：单人走通全链路（新开一个 agent 会话，逐句说）**
1. `From now on, use pnpm here, not npm.` → agent 记下规则（“Use pnpm, not npm, in this repository.”）并告知你；如果你在工作中直接纠正它，也会这样。
2. `Keep it.` → 弹窗显示规则原文，点 Proceed，规则只装给你自己的 agent，下次会话生效，不外发。
3. `Create a PeerHarness team called acme.` → 你是唯一成员。
4. `Propose the pnpm rule to acme.` → 弹窗显示将要离开本机的确切文本，点 Proceed 进入投票。
5. `Vote approve on it.` → 弹窗显示选票，点 Proceed，1/1 通过，规则成为团队规则。

每个窗口都只有 Cancel 和 Proceed，默认为 Cancel，并且 agent 无法替你点这个窗口。之后可用 `What is in my PeerHarness inbox?` 查看已记规则与待投票提案，用 `Anything new in PeerHarness?` 与其他成员同步。

**第 5 步：拉第二个成员（双方需人工核对指纹）**
1. Dana：问 `What is my PeerHarness device key, and its fingerprint?`，把公钥发给你（公钥可以走聊天）。
2. 你：`Invite Dana to acme. Her device key is ed25519:…` → 弹窗显示被接纳设备的指纹；点击前先用电话或当面让 Dana 念一遍她的指纹，一致再点 Proceed；然后把你 node 的 peer id 和团队 root 指纹告诉她。
3. Dana：`Join the team. The peer id is 12D3…, the fingerprint is 8e8d-…` → 弹窗显示指纹和成员名单，Proceed 加入。

从此每条规则需要你们两人都投票，接纳第三个成员同理。注意：join 窗口只显示章程和规则条数，不显示规则全文，加入即安装了你没读过的规则（之后可逐条 opt-out）。

**第 6 步：让 node 常驻（否则只有 agent 会话打开时可达）**
```bash
peerharness daemon --internet --sync-every 60
```
macOS 上可加 `--notify`。注意 internet 模式会把你的 node 公钥和 IP 暴露给志愿者运行的服务器。

**第 7 步：治理与退出（都需要终端）**
```bash
peerharness circle mode ask --circle <team>        # 规则通过后先问你，再装
peerharness rule opt-out <name> --circle <team>    # 本机退出单条规则
peerharness demo                                   # 临时目录跑一遍三人投票，不碰你的 home 和 ~/.claude
```
移除成员、退队、改投票门槛、废除规则、编辑/驳回已记规则、以及所有被扫描器判为高风险的规则决策，也都在终端完成。

## 对应的研究问题

**能力发现（AI 还能接管什么）**：可以把“在对话中被纠正”这件事本身交给 agent 处理：agent 在会话中途识别纠正、归纳成一句话规则、说明它记了什么、并提示你可以留用或提交团队，而不是靠人记得去改配置文件。这是“把一次性反馈转成持久约束”的工作。

**任务匹配**：适合“跟着人走、跨仓库”的偏好型规则（如工具链选择、提交信息风格），尤其是没有共享仓库或没人管仓库的团队，以及希望看到规则原文、能单独 opt-out 的成员。README 明确说不适合的场景：规则只针对某一个仓库、团队本来就走 PR 评审，那就直接提交文件（如 CLAUDE.md），不需要 PeerHarness。模型/工具匹配上，Claude Code 能全自动捕获纠正（两个 hook + skill + tools）；其他 14 个 agent 只有 skill 和工具，纠正仅在 agent 主动记录时才被捕获，能力不对等。

**条件供给**：需要提供 (1) 安装与启动权限：agent 负责装二进制，`setup` 必须由人跑，因为那是授权环节；(2) 本地密钥与数据库；(3) Claude Code 的两个 hook、一个 skill 及其工具；(4) 人的点击：所有留用、分享、投票、邀请、加入都要人在弹窗里点 Proceed，agent 点不了；(5) 团队协作条件：双方设备指纹要经过聊天之外的渠道（电话/当面）口头核对，还需要交换 peer id 与团队 root 指纹；(6) 常驻条件：daemon 运行，node 才可达；(7) 治理条件：团队名、成员名册、投票门槛。

**主动推进**：有一部分。事件驱动明显：发生纠正 → 记规则；提案 → 进入投票；章程通过 → 向每个成员节点下发安装；成员变更 → 重新计票。但 README 明确说“没有截止时间、没有协调者”，不会催票，长期无人投票只会让门槛更难达到；也没有后台服务，node 只在 daemon 运行时可达（这是目前“持续完成”的主要缺口，需要自己用 `daemon --internet --sync-every 60` 补）。

**效果验证**：README 没有给出任何效果指标或收益数据。它提供的只是“机制可验证”：`peerharness demo` 会在临时目录造三个成员加一个外部人，各自独立密钥与数据库，跑出计票、拒绝非成员选票、创始人 root key 也无法绕过投票的结果，可用来确认“每个节点自己计数并一致”这一层；至于“AI 行为是否真的变好”，原文没有度量方法，需要自行设计。

## 与已有做法的关系

- 清单中的 **Claude Code（adopt）**：PeerHarness 把它当一等公民（唯一配 hook 的），是叠在它之上的规则分发层，不是替代。
- **Cursor（watch）、Google Antigravity（watch）、goose（watch）、OpenCode（watch）、GitHub Copilot（drop）、DeepSeek Harness（watch）**：都在 PeerHarness 的支持列表里，但只拿到 skills/规则和工具，没有 hook；goose 与 DeepSeek Harness 需要你手动添加 tools 条目（README 说 setup 会显示该条目让你自己加）。清单把 Copilot 标为 drop，而 README 声称支持 Copilot CLI，二者不冲突但接入优先级应靠后。
- **DeepSeek（try）**：README 未提及，不做推断。
- 清单中没有“团队规则投票/反馈闭环/规则分发”这类条目，PeerHarness 是这个位置上的第一个候选项。它最直接的替代做法是“把规则提交进 git 里的 CLAUDE.md”，README 自己也承认：单仓库且走 PR 评审时，那个做法就够了，不需要本工具。

## 证据与局限

**原文给出的可核查内容**：完整的安装与 setup 命令、五步单人试用脚本、三步邀请流程、一张投票弹窗的原文文本、`peerharness demo` 的 abridged 输出（Alice 赞成、Carol 以“CI 镜像只有 npm”为由反对并留档、Bob 赞成后 2/3 通过；Mallory 不在名册被拒；创始人 root key 签的章程仍被各节点拒绝）、五条不可关闭的不变量、以及 `docs/terminal.md`、`docs/limits.md`、`docs/checked.md`、`docs/security-model.md` 等文档入口。

**只是作者主张、没有外部证据**：所有关于“更动态更民主”“团队会照着做”的论断；效果层面的任何收益；安全性上的保证（作者自称 not audited，测试方法只指向 `docs/checked.md`，本次材料未包含该文件）。开发背景是作者自述“2026 年 11 月 9 日至 11 日用 Claude Code 写成”，意味着这是一个只有几天开发期、31 stars 的年轻项目。

**原文自陈的局限（选型时必须读）**：
- agent 的确认限制不是沙箱：会话靠 agent 设置的环境变量识别，同用户下的进程隐藏该变量即可带 `--yes` 跑同样命令；Antigravity 根本不文档化这个变量。
- 规则是 agent 会执行的文本，风险扫描器和脱敏都是启发式的，要像读脚本一样读规则。
- 加入团队时会安装你没读过的规则（窗口只显示条数与章程）。
- 创始人可以不经投票撤销某台设备（丢电脑场景），被撤销设备的选票作废，可能推翻原本成立的结果；root key 丢失则无人能被接纳或移除。
- 无秘密投票；成员上限 64 人；从不投票的成员会让门槛更难达到；没有截止时间。
- 无后台服务，node 仅 daemon 运行时可达；internet 模式向志愿者服务器暴露公钥和 IP。
- Windows 不支持；Linux 无窗口，所有决策走终端。

**材料本身局限**：只拿到 README，`docs/` 下的终端手册、limits、checked、security-model、protocol 等均未提供，因此涉及具体命令参数细节、撤销流程、协议层的描述只能依据 README 摘要判断，未经验证。README 中的日期为 2026 年，与项目版本 v0.4.0 一样，都指向项目处于很早期。

## 怎么试、怎么验证

**最小试用（建议 1–2 天，先单人后双人）**
1. 在 macOS + Claude Code 上先跑 `peerharness demo`，确认投票、拒绝非成员、root key 无法绕过这几条机制在你机器上成立，且不触碰你的 home 与 `~/.claude`。
2. 执行安装 + `setup`，逐项确认它要改的 hook/skill（重点确认“保留 14 天脱敏 prompt 副本”这一项你是否接受）。
3. 按第 4 步五句话走一遍，把 pnpm 规则从纠正一路推到“1/1 通过并安装”。
4. 只拉一个队友进来，验证指纹口头核对流程与“通过后无人值守自动安装”是否如描述工作。
5. 选 1–2 条真实规则（跨仓库的个人偏好，不是单仓库规范），跑一周。

**判断是否改善的指标（建议开工前先定基线）**
- 纠正捕获率与准确率：一周内你实际做出的纠正中，有几次被 agent 自动记成规则；生成的规则文本需要你手动改写的比例（>30% 说明归纳不可靠）。
- 重复犯错次数：同类错误被重复纠正的次数，试用前后对比；对照组用“把同一规则写进 CLAUDE.md 提交”的方式。
- 从纠正到全队生效的成本：需要几次人工点击、多少小时（含等队友投票的时间）。
- 治理成本：弹窗次数/人/天（过多会让人关掉注意力，反而削弱“人必须点”的保护价值）、需要 opt-out 或回滚的规则条数、高风险规则被扫描器拦下的次数与准确率。
- 可达性与同步延迟：daemon 掉线次数、规则下发延迟、投票结果在不同节点是否一致（不一致即视为阻断性问题）。
- 安全侧硬性检查：确认没有出现过 agent 在你未点击时完成留用/投票/邀请；确认没有规则包含工具预授权或 shell 注入语法（README 说这类内容会被直接拒绝，需实测）。

**止损条件**：出现任何一次 agent 绕过弹窗完成决策、或某条规则在你不知情时被安装（join 场景除外，那属于已知设计），就应停用并降级为“仅在 demo/只读模式观察”。
