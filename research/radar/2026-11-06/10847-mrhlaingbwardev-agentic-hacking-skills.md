# mrhlaingbwardev/agentic-hacking-skills

- 结论：**值得研读**。把这条线索当作“用文件目录把技能、工具和权限供给智能体”的范式样本研读，不要直接安装使用：README 里可照抄的只有目录约定和几条复制命令，28 个 SKILL.md 的实质内容在付费电子书里、许可证为 Proprietary、面向授权渗透测试，既无法验证也不通用。若要落地，就把同样的 skills/agents/mcp-servers/config 四件套搬到自己的重复任务上做最小试验。
- 原文：https://github.com/mrhlaingbwardev/agentic-hacking-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T07:45:29.586Z

## 是什么

这是 GitHub 仓库 `mrhlaingbwardev/agentic-hacking-skills`（345 stars）的 README，作者 Hlaing Bwar，定位是电子书《Agentic Hacking》的“官方附赠材料”（bonus material）。README 主体用缅甸语写成，大半篇幅在导流到付费电子书站点 `ebooks.hlaingbwar.me`（书中含 6 个模块 + 28 个 SKILL.md 模板）。

仓库自述包含四类内容：

| 目录 | 内容 |
|------|------|
| `skills/` | 28 个 SKILL.md 模板 |
| `agents/` | 一个 web-pentest agent |
| `mcp-servers/` | 自建的 `wsl-security-tools` MCP server |
| `opencode.jsonc` | MCP 配置文件 |

License 徽章标注为 **Proprietary**。README 中**没有展示任何一个 SKILL.md 的实际内容**，只给了目录名和安装方式——也就是说，能拿到的只是“供给方式”，不是“被供给的东西”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提：已安装 OpenCode，且存在 `~/.config/opencode/` 配置目录。以下命令与提示词均照抄原文，仅作搬运，未做验证。

**步骤 1｜克隆仓库**（需 git 与网络）

```bash
git clone https://github.com/mrhlaingbwardev/agentic-hacking-skills
```

**步骤 2｜把三类文件分别拷进 OpenCode 的约定目录**

Linux / macOS / WSL：

```bash
git clone https://github.com/mrhlaingbwardev/agentic-hacking-skills
cp -r agentic-hacking-skills/skills/* ~/.config/opencode/skills/
cp -r agentic-hacking-skills/agents/* ~/.config/opencode/agents/
cp -r agentic-hacking-skills/mcp-servers/* ~/.config/opencode/mcp-servers/
```

Windows PowerShell：

```powershell
git clone https://github.com/mrhlaingbwardev/agentic-hacking-skills
Copy-Item -Recurse agentic-hacking-skills\skills\* "$HOME\.config\opencode\skills\"
Copy-Item -Recurse agentic-hacking-skills\agents\* "$HOME\.config\opencode\agents\"
Copy-Item -Recurse agentic-hacking-skills\mcp-servers\* "$HOME\.config\opencode\mcp-servers\"
```

**步骤 3｜合并 MCP 配置**

把仓库里的 `opencode.jsonc` 合并进你现有的 OpenCode 配置。原文提醒：该文件里的 API keys 是**占位符（placeholder）**，需替换成自己的真实 key。

**步骤 4｜重启 OpenCode**

原文：装好后“把 OpenCode 关掉再打开”即可。

**步骤 5｜作者推荐的“免手动”安装法：让 AI 自己装**

原文给出的提示词（缅甸语，原样）：

```
ဒီ GitHub repo က skill တွေ၊ agent တွေ၊ MCP config တွေ အကုန် 
OpenCode ထဲ ထည့်ပေးပါ —
https://github.com/mrhlaingbwardev/agentic-hacking-skills
```

大意是：“把这个 GitHub repo 里的 skill、agent、MCP config 全部装进 OpenCode”，然后由 AI 自行下载并放进对应文件夹。这一步的前提是**你的 agent 有 shell/文件写入权限**——这本身就是一次权限授予决策，不是无成本的便利。

**步骤 6｜模型选择（作者主张，非可验证步骤）**

原文强调要选轻量、reasoning 少的模型（举例 **DeepSeek Flash**），理由是“deep reasoning 模型容易拒绝安全类请求”。

**步骤 7｜使用边界**

原文声明：这些 skill/agent 仅用于**授权测试（authorized testing）**。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**——无依据。README 只写“28 个 SKILL.md”，一个都没有展开，无法判断 AI 在渗透测试里具体能承担哪些工作。

**2. 任务匹配**——有一条明确主张：安全类任务应搭“轻量、低 reasoning”的模型，因为强推理模型会拒绝此类请求。这只是作者主张，无对比数据，且本质是针对模型内容策略的规避，不具备通用迁移价值。

**3. 条件供给**——本线索最相关的一点。它把“供给”拆成四类可版本化的文件：技能（`skills/*/SKILL.md`）、角色（`agents/`）、外部工具能力（`mcp-servers/`）、连接配置（`opencode.jsonc`），各自放进工具约定的固定目录，由 agent 运行时自动加载；并把“安装”本身也交给 agent（给链接 + 一句自然语言指令）。这是一个成本很低、可复制的供给形态。

**4. 主动推进**——无依据。README 未涉及任何由时间、事件或状态触发的持续执行机制。

**5. 效果验证**——无依据。没有任何评测、指标、案例或前后对比，只有“我自己一直在用”这类自述。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **OpenCode（清单状态：watch）**：本仓库是 OpenCode 扩展目录约定（`~/.config/opencode/skills|agents|mcp-servers` + `opencode.jsonc`）的一个具体实例，可作为“OpenCode 怎么被第三方项目扩展”的样本，但仅凭这份 README 无法把它从 watch 升级为可推荐。
- **DeepSeek（清单状态：try）**：README 直接点名 DeepSeek Flash 为推荐模型，理由却是“不容易拒绝安全请求”，这是使用场景层面的主张，不构成对 DeepSeek 能力的正面证据。
- 清单中没有与“SKILL.md 文件化技能供给”直接对应的条目，这条线索的价值主要在补这个范式位。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的“证据”全部是仓库自述与元信息**：目录清单、三份安装命令、一个配置文件名、徽章上的 28 skills / 1 MCP / Proprietary 许可、345 stars。**没有任何案例、前后对比、测评数据或用户反馈。**

**明确的局限：**

1. **核心内容不可见**：28 个 SKILL.md 的实际写法不在原文中，无法判断其模板质量，也就无法判断“这个范式被实现得好不好”。
2. **商业属性**：仓库是付费电子书的附赠目录，真正的方法论在书里；README 的说服力指向购买页而非技术细节。
3. **许可证 Proprietary**：不能直接抄写、改写或分发其内容进你的手册，只能借鉴结构。
4. **领域狭窄**：面向授权渗透测试（web-pentest agent、wsl-security-tools），与大多数通用工作岗位不重合。
5. **语言与可读性**：README 为缅甸语，本报告只能依据其中可读的结构、命令与少量明确表述，未覆盖部分不应假设存在内容。
6. **伦理风险点**：“选低推理模型以避开拒绝”这一条是把模型安全策略当作障碍绕过，不宜作为通用实践写入手册；原文自己也只是把它写成经验之谈。
7. **稳定性承诺无法验证**：作者称仓库若被下架会“用同样的用户名和仓库名重新发”，说明其对链接持久性本身没有把握。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**不建议安装该仓库本体**（许可证、领域与内容可见性都不满足），建议只做“范式移植”的最小试验：

1. 选一项你自己每周重复做、步骤稳定的工作（如固定格式的周报汇总、日志排查、数据清洗）。
2. 把这项工作的做法写成一份 `SKILL.md`，放进 `~/.config/opencode/skills/<任务名>/`，内容只写：触发条件、输入要求、步骤、验收标准。
3. 配一个只给必要权限的 agent 定义，放 `agents/`；如需要外部工具，再补 `mcp-servers/` 与配置项。
4. 另找一台机器或一位同事，只用“repo 链接 + 一句自然语言安装指令”复现一次，记录卡在哪里。
5. 跑 2 周，与手工方式并行对比。

**判断有没有改善的指标（建议 4 个）：**

- 首次装配耗时：从零到任务跑通需要多少人工步骤；
- 重复执行的人工干预次数：同类任务第 2、3 次是否还需要逐步指导；
- 输出与手工作业的一致率：抽 10 个样本比对，不一致的属于“能力问题”还是“输入信息不足”（后者才是供给设计要修的）；
- 换人/换机复现成功率：别人照着你写的 SKILL.md 能不能一次跑通——这是这套文件化供给范式最该被验证的一点。

若这四项里有三项以上改善，说明“文件化供给”在你这里成立，可以写进手册；若只有首次装配变快、复现失败，则说明只是把复杂度转移给了 agent 的权限，而非真的降低了工作成本。
