# Sequester-AG/bug-bounty-triage

- 结论：**值得一试**。可以小范围试装这套 agent skill，用它做漏洞报告的分诊与提交前把关（安装命令和调用提示词都能直接照抄），但给定材料只有 README、核心工作流在 SKILL.md 里没给出来，所以先试不直接采用。
- 原文：https://github.com/Sequester-AG/bug-bounty-triage
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-10T04:49:02.612Z

## 是什么

`bug-bounty-triage` 是一个 **agent skill**（打包好的 agent 指令集），MIT 协议，面向漏洞赏金（bug bounty）报告的分诊场景。按 README 描述，它帮 agent 做四件事：

- 在**获得测试授权**的前提下端到端复现漏洞发现；
- 把**观察到的证据**和**推断**分开；
- 在提交前**否掉弱报告或不可操作（non-actionable）的报告**；
- 在不夸大严重性的前提下追求**最高可辩护的影响等级**，并产出简洁、证据密集的 Markdown 报告。

仓库自身内容只有两项：`SKILL.md`（skill 元数据、工作流、验证关卡 validation gates、影响升级指引、报告格式）和 `LICENSE`。也就是说，真正的工作流细节在 SKILL.md 里，而本次材料只给了 README。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：只在你拥有、或获得明确书面授权的系统上使用。** README 明确写了：调用这个 skill 本身不授予任何测试权限，不得超出项目范围、不得访问无关数据、不得做破坏性操作。

**步骤 1：安装 skill（三选一，取决于你的 agent 环境）**

Skills CLI 方式：
```bash
npx skills add Sequester-AG/bug-bounty-triage --skill bug-bounty-triage
```

Codex 方式：
```bash
git clone https://github.com/Sequester-AG/bug-bounty-triage.git ~/.codex/skills/bug-bounty-triage
```

通用 agent skills 目录方式：
```bash
git clone https://github.com/Sequester-AG/bug-bounty-triage.git ~/.agents/skills/bug-bounty-triage
```

**步骤 2（可选，仅当要做实时验证时）：安装两个配套 skill 及其命令行工具**

先装 skill：
```bash
npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser
npx skills add https://github.com/zaddy6/agent-email-skill --skill agent-email-cli
```

再装对应的 CLI（skill 只提供指令，实跑需要工具）：
```bash
npm install -g agent-browser
agent-browser install
npm install -g @zaddy6/agentemail
```

`agent-browser` 用于浏览器自动化，`agent-email-cli` 用于一次性测试邮箱。前提是你的宿主环境具备浏览器/HTTP 能力——README 说明完整工作流会用到浏览器自动化、直接 HTTP 请求和一次性邮箱账号。

**步骤 3：用报告、漏洞描述，或「目标 + 发现」调用 skill**

可直接复制的提示词模板：
```text
Use $bug-bounty-triage to validate this report and determine whether it is ready to submit: <report>
```

**步骤 4：提供授权与范围**（做实时验证时）。如果宿主环境不支持实时测试，README 要求 skill **明示哪些部分仍未验证**。

**步骤 5：读输出报告**。对支持且达到提交标准的发现，skill 会写一个以「目标 + 漏洞类别」命名的 Markdown 文件，例如：
```text
example-com-idor.md
```
内部评审意见不会写进这个提交文件里。

**步骤 6：分享或提交前自己过一遍生成的文件**。README 提醒：当你提供了敏感证据时，skill 可能把它保留在生成的报告里，需遵守对应赏金平台的规则后再外发或提交。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：报告分诊与定级、独立复现验证、影响等级升级、把零散发现整理成提交就绪的报告——这几类工作平时很少有人会想到交给 AI 做，README 把它们列成了 skill 的目标能力。

**2. 任务匹配**：适合「有明确输入（报告/漏洞描述/目标+发现）+ 需要多步验证」的分析型任务；需要宿主 agent 具备浏览器自动化、直接 HTTP 请求、一次性邮箱这几项能力时才能跑完整流程；宿主不具备实时测试能力时，任务退化为「基于现有报告做静态判断并要求标注未验证项」。

**3. 条件供给**：需要提供——测试授权与项目范围、待审报告或目标与发现、可用的浏览器自动化/HTTP/一次性邮箱工具、适用的赏金平台规则。skill 侧的反馈机制是自带的 validation gates（验证关卡）和「提交前拒绝弱报告」的判定。

**4. 主动推进**：原文没有提到任何定时、事件或状态触发的持续运行方式，只有用户显式调用这一种入口，因此这一条在本材料中没有依据。

**5. 效果验证**：原文没有给出任何量化指标或验证方法。只能从 README 的措辞推断其自设的质量标准——证据与推断分离、不夸大严重性、拒绝不可操作的报告、输出「证据密集」。这些是作者主张，不是实测结果。

## 与已有做法的关系

清单中相关条目有两个：

- **Agent skills（concept，状态 adopt）**：本条目正是该概念的一个具体实例——把领域工作流打包成可安装的 skill，并用 `SKILL.md` 承载元数据、工作流、验证关卡与输出格式。
- **skills.sh（source，状态 try）**：README 用 `npx skills add ...` 分发，配套的两个 skill（agent-browser、agent-email-cli）也指向 skills.sh 的地址，是这条分发渠道的实际用例。

除这两条外，清单中没有直接对应「安全报告分诊」这一工作流的条目。

## 证据与局限

**材料给出的证据**：
- 明确的仓库结构：只有 `SKILL.md` 和 `LICENSE`，MIT 协议；
- 三套可复制的安装命令、两个配套 skill 的安装命令与 CLI 安装命令；
- 一段可直接使用的调用提示词；输出文件命名规则（`目标-漏洞类别.md`）；
- 安全边界声明：调用 skill 不等于获得测试许可，不得超范围、不得访问无关数据、不得破坏。

**只是作者主张的部分**：分诊质量、独立验证的可靠性、影响定级的准确性，全部没有数据或案例支撑；也没有说明 validation gates 具体卡什么条件。仓库约 51 stars。

**这次材料的最大局限**：真正的工作流、验证关卡和报告格式都在 `SKILL.md` 里，而本次输入只有 README。所以上面能提炼的只有「怎么装、怎么调用、输出长什么样」，**分诊与验证的具体步骤无法从材料中复现**——这也是只给 try 而不给 adopt 的直接原因。另外 README 提到的仓库名是 `Sequester-AG/bug-bounty-triage`，而 `npx skills add` 命令里的 owner 写作 `Sequester-AG`，克隆地址也是 `Sequester-AG`，使用前建议核对一下是否同一仓库。

**适用条件**：必须持有测试授权或在自有系统上操作；需要有支持 skill 机制的 agent 宿主；要跑实时验证还得额外装 agent-browser 与 agent-email-cli 及其 CLI。

## 怎么试、怎么验证

**最小试用方式**：不要一上来就打真实赏金目标。找 3～5 份**你已知结论**的历史漏洞报告（包含你自己判定的「有效」和「弱/误报」两类），按上面的命令装好 skill，逐份用调用模板跑一遍，让 agent 给出「是否具备提交条件」的结论和理由。

**判断有没有改善的指标**：
1. **分诊准确率**：在你已知答案的那批报告上，agent 的「能否提交」判断和你的事先判断一致的比例；重点看你混进去的假阳性样本有没有被拒掉。
2. **证据/推断是否分离**：输出里是否清楚标出哪些是实测复现的、哪些是推测的——这是 README 承诺的核心能力，可以直接对文本打分。
3. **严重性是否被夸大**：对照你自己给这些报告的定级，看 agent 有没有系统性高估。
4. **输出是否可直接用**：生成的 `目标-漏洞类别.md` 是否不用大改就能提交（内部评审注释确实没混进去）。
5. **不可验证时的诚实度**：故意用一份无法实时复现的报告，看它是否主动声明「未验证」，而不是编造复现结论。

如果这五项里第 1 项没有明显优于你自己手工分诊、第 2 或第 5 项明显不达标，就只当作思路参考（退回 study），不要进日常工作流。
