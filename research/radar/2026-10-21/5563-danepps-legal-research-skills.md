# danepps/legal-research-skills

- 结论：**值得一试**。建议小范围试：用一份 3–5 页带脚注的短稿跑一遍 cite-check，重点看报告是否能把「已确认问题 / 无法核实 / 误报」分开且能按引文定位；理由是该仓库把「引用可核查」做成了从安装、setup 到固定报告文件的完整可照做流程，但作者自述会漏报误报、Codex 桌面安装路线尚未端到端验证，且本次只有 README 可依据。
- 原文：https://github.com/danepps/legal-research-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T06:08:29.526Z

## 是什么

Legal Research Skills 是华盛顿大学法学院教授 Daniel Epps 发布的免费（MIT）技能包/插件，给 Claude Code（桌面端 **Code** 标签）或 Codex（ChatGPT 桌面端）加一套带核验环节的法律研究工作流：直接读 Word 文件里的脚注、检索来源、比对引文与原文、记录「查过什么」，最后落一份可逐条处理的报告文件。README 自述的能力有六类：

- **引注核查（cite-check）**：核对引文、引号内文字、脚注交叉引用；报告分「需你注意」段与「无法核实」项；附带提示未更新后续历史（affirmed / reversed / cert. denied）的下级法院案例、以及被后续判决 overrule 或 limited 的案例；**重跑时报告开头列出与上次相比的变化**。
- **找支持性权威**：「为某命题找引注」，给出具体页码和可写进脚注的短说明。
- **校对**：错字、漏词/重词、术语与交叉引用不一致。
- **建 Zotero 文库**：找来源、建条目、查重、附可用 PDF（需连 Zotero）。
- **写研究备忘录**：带来源链接并披露局限。
- **准备最高法院案卷材料**到 reMarkable 平板（仅 Claude 插件，需额外设置）。

关键定位：它不是「让 AI 帮你查资料」，而是把**引用可核查**做成可重复的流程——原文明确说普通 AI 对话也能帮忙，这些技能增加的是「读脚注→取源→比引文→记录核查状态→存报告」这条链路，并且**结论仍由人负责**。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 路线 A：Claude 桌面端（README 主推，步骤最完整）

**前提**：Mac 或 Windows；Claude 订阅需包含 Claude Code（Pro / Max，部分 Team、Enterprise 可用）；不需要开终端。

1. 安装并登录 Claude 桌面版，点顶部 **Code** 标签（名字叫 Code，但研究写作都用这个标签）。
2. 准备一份**短的** Word 文档（「几页纸、带脚注」最适合首次测试），放在一个好找的文件夹里。
3. 选目录：消息框下方第一个控件选 **Local** 下的第一项（Windows 上不要选 WSL 条目，那里不支持插件）；再点旁边的文件夹控件 → **Open folder…** → 选中放文档的文件夹。
4. 装插件：把下面整行粘进 Code 标签的消息框回车。

```text
/plugin install legal-research --marketplace danepps/legal-research-skills
```

   提示添加来源 `danepps/legal-research-skills` 时确认；详情面板里选 **Install for you**（对所有文件夹可用）→ **Install**。

5. 在同一文件夹下**新开一个会话**，跑 setup：

```text
/legal-research:setup
```

   它会检查依赖软件并引导补全。要点：
   - **CourtListener**：按提示注册免费账号（用于引注核查的判例库），从个人页复制 *token*（一串字母数字）粘进去。
   - **Zotero**：不用就回答 **skip**，之后仍可做引注核查、校对、找引注、写备忘录。
   - **自动更新**：可选，可事后用 `/legal-research:setup` 开关。
6. 新开会话（同一文件夹）跑第一个任务，把文件名换成自己的：

```text
Cite-check "My Article.docx" in this folder. Leave the draft unchanged.
When you finish, show me the report and explain how to open it.
```

   过程中它可能请求执行命令/联网、或把任务拆给多个 AI 助手，需逐次批准。
7. 读结果：报告存为与草稿同目录、文件名以 `Cite Check.md` 结尾的文件；先看 **needs your attention** 段，区分「已确认的问题」与「无法核实」项，用报告里引的原文词句和脚注号回 Word 定位。
8. 安装快捷方式不被识别时的兜底（老版本 Claude Code 需要两条分开的快捷方式，逐条回车）：

```text
/plugin marketplace add danepps/legal-research-skills
```

```text
/plugin install legal-research@danepps
```

   然后详情面板选 **Install for you** → **Install**，再回第 5 步。

9. 环境类故障处理（README 明确给出）：Mac 弹「command line developer tools」点 **Install** 等待完成重试；Windows 装插件需要 Git for Windows，装完按提示重启 Claude；setup 快捷方式不出现则新开会话，或用消息框旁 **+** → **Add plugins** 确认已安装。
10. 企业账号被管理员限制插件源时，README 给了可直接转发管理员的原话：允许 Claude Code 设置中的插件市场 `danepps/legal-research-skills`（GitHub 仓库，作者 Daniel Epps，Washington University in St. Louis），以便安装 `legal-research` 插件；该插件只增加研究指令和脚本，不改变文件可见范围。被拒则改用下载文件夹在个人账号上跑的方案（见 TECHNICAL.md，本次未提供内容）。

### 路线 B：Codex 桌面端

**前提**：ChatGPT 桌面端可用文件夹；不需要 Codex CLI、不需要 Claude。

1. 下载 ZIP 并解压，保留外层 `legal-research-skills-main` 文件夹（里面有告诉应用去哪里找插件的 catalog）。
2. 在桌面端把该文件夹选为本地项目（选**外层**目录）。
3. 重启桌面端、重开该项目，打开 **Plugins**，选来源 **Daniel Epps: Codex Research Skills** → **Legal Research Skills** → 点安装（可能是 **+**）。来源不出现就先确认选的是解压后的目录。
4. 手动做一次环境自检（注意：插件里的 `setup` 助手**只处理更新**，不能替代这步）。新开会话、选中草稿文件夹后问：

```text
Check what I need to use Legal Research Skills on this computer, including Python, web access, and CourtListener. Walk me through anything missing.
```

5. 首个任务（换成真实文件名）：

```text
Cite-check My Article.docx. Leave the draft unchanged, and show me how to open the report.
```

6. 更新是**手动**的：重新下 ZIP、重做选目录与安装；仍显示旧版就在 Plugins 里先卸载再装；ZIP 安装不受可选定时更新器影响。工具文件夹与研究文档分开放。

### 通用前提与成本提醒（原文明确）

- 一次完整 cite-check 可能消耗**相当多**的套餐额度，**先用短文档**起步。
- 登录/付费墙后的来源：自己提供**有权限下载的 PDF**，报告应标出工具访问不到的来源。
- 更省事的入口：直接在已打开的 Code 标签里粘下面这句让 AI 自己装，只在它做不了的事上配合（最主要的是注册 CourtListener 并粘 token；不用 Zotero 就说 **skip**；请求执行命令或联网就同意）：

```text
Install and set up the legal research skills from https://github.com/danepps/legal-research-skills for me. Follow the instructions in its INSTALL.md.
```

- 出问题就用大白话描述看到的报错，通常能绕过去；卡住再走上面分步指南或邮件联系作者。

## 对应的研究问题（对照五个问题逐条说明，只写有依据的）

**1. 能力发现（哪些活可以交给 AI）**
- 逐条核对引文与引号内文字是否与来源一致，并核对脚注交叉引用；
- 判断下级法院案例的引用是否遗漏后续历史（affirmed / reversed / cert. denied），以及是否被后续判决 overrule 或 limited；
- 重跑时对比上次报告、只报变化；
- 为某命题找若干**已核实**的权威并给页码与脚注用语；
- 校对错字、漏词/重词、术语与交叉引用不一致；
- 建 Zotero 文库（查重、附 PDF）；
- 写带来源链接与局限披露的研究备忘录；
- 汇集最高法院案卷材料供平板阅读。
这些都属于「原本默认由研究助理人工做、不容易想到交给 AI」的核验类工作。

**2. 任务匹配（什么活配什么模型/工具/协作方式）**
- 载体是**桌面端 Claude Code 或 Codex + 本地文件夹**，以插件/技能包形式注入研究指令与脚本，而不是在聊天窗口里贴文本；
- 输出固定落成同名 `Cite Check.md` 报告文件，便于逐条处理；
- 大任务可**拆分给多个 AI 助手**，交付前再复审一遍；
- 结构化边界清楚：能自动查的查，访问不到的（付费墙/登录）交回人工给 PDF，并在报告里标出「查不到」；
- 需要人判断的部分留在「advisory」段落而不是混进结论。

**3. 条件供给（要给什么信息、工具、权限、反馈）**
- 账号与凭证：CourtListener 免费账号 + token；
- 软件：Python、联网能力；Windows 上还需要 Git for Windows；
- 订阅：Claude 含 Claude Code 的套餐（Pro/Max，部分 Team/Enterprise）；
- 文件权限：在 Code 标签选定 Local 目录（Windows 不选 WSL），草稿为 .docx；
- 可选：Zotero 文库；
- 交互中的授权：允许执行命令、允许联网、允许拆分给多助手；
- 反馈回路：报告里「已确认 vs 无法核实」，重跑时列出与上次的差异。

**4. 主动推进（时间/事件/状态触发、持续完成）**
- 有**状态比较**式推进：重跑时报告开头显示「自上次以来的变化」——这是明确写出的机制；
- 有**可选自动更新**（Claude 端 setup 里开关，Codex 走命令行路线可用 `$legal-research:setup` 开启；ZIP 路线必须手动）；
- 但**没有**时间/事件触发的持续任务编排（如定时巡检一个文件夹里的新稿）。这一点原文无依据，不能外推。

**5. 效果验证（怎么判断真的改善了结果）**
- 产物可检查：报告文件本身、`needs your attention` 段、引用的原文词句与脚注号可回原文定位；
- 明确区分「已确认的问题」与「无法核实」项——即报告自带置信分层；
- 自述会**漏报也会误报**，因此正确用法是把它当补充，叠加自己的阅读和期刊的 cite-check，而不是替代；
- 重跑差异可作为稳定性观察点。

## 与已有做法的关系

清单中只有一条相关条目：**Claude Code**（tool，status: adopt）。本线索是跑在 Claude Code（以及 Codex）之上的**领域化技能包/插件**，属于对已有工具的加工：把「安装 → setup 凭证 → 固定任务提示词 → 落报告 → 重跑比对」这条流程固化下来。除此之外，清单中没有相关条目。它的可迁移价值不在法律本身，而在「引用可核查」这套模式——可类比到报告的数据引用、政策文件条款引用、代码注释里的出处引用等需要逐条对源的工作。

## 证据与局限

**原文给出的具体事实（可核对的部分）**
- 作者身份与自用背景：Daniel Epps，Washington University in St. Louis 法学院教授，*Divided Argument* 播客联合主持，声明这些工具用于自己的学术写作；MIT 许可，「as-is」发布。
- 具体的安装路径、命令、提示词（上文已照抄）、两条安装路线、故障处理清单、以及「完整 cite-check 会消耗大量额度、先用短文档」的成本提醒。
- 明确的诚实边界：
  - 「These tools can miss problems and raise false alarms.」——会漏报，也会误报；
  - 付费墙/登录来源需用户提供有权限的 PDF，报告应标出访问不到的来源；
  - Codex 的桌面按钮安装**尚未在全新账号上端到端测试**（只验证了在插件浏览器里能正确出现）；
  - Codex ZIP 路线更新需手动，定时更新器不管 ZIP 安装；
  - Zotero 非必需。

**只是作者主张、无数据支撑的部分**
- 「AI 自己装比任何书面说明都更能应付意外」——经验判断，无对照数据；
- 报告能有效区分确认问题与未核实项、能发现未更新后续历史/被 overrule 的案例——**README 未给任何案例、准确率、召回率、耗时或成本数字**；
- 拆给多个助手再复审能提升质量——无证据。

**本次材料的局限**
- 只拿到 README（source_note 亦标注「依据仓库 README」）；INSTALL.md、TECHNICAL.md、CHANGELOG、codex/README.md 均未提供，因此依赖细节、脚本实现、报告字段结构、是否需要额外 API key 等都无法核实；
- 无法验证插件当前版本、是否真能被 Claude 插件市场正常索引；
- 没有第三方评测或用户反馈，40 stars 说明使用面还很小。

**适用条件**
- 最适合：法律学术写作、需要逐条核对引注的稿件（法评 cite-check 场景）；也适合作为「引证核查」类工作流的样板；
- 需要：Claude 含 Claude Code 的付费套餐或 Codex 桌面端；愿意注册 CourtListener 并提供 token；稿件是 .docx 且引注在脚注里；
- 不适合：把结果直接当定论用；处理大量付费墙来源而不准备 PDF；期待定时自动运行的流水线。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. 取一份 3–5 页、脚注 15–30 条、且你自己已人工核过一遍的旧稿（有关键作用：你手里有答案）。
2. 按路线 A 的第 1–5 步装好并 setup，用第 6 步原样提示词跑 cite-check，**保持草稿不改**（提示词已含 `Leave the draft unchanged`）。
3. 保留生成的 `Cite Check.md`；同一份稿**再跑一次**，看开头是否只列变化。
4. 换一份非法律的、带数据出处/条款引用的文档（如内部报告），用同样的提示词改一下对象再跑，检验这套「读脚注→对源→出报告」的模式能否迁移。

**判断有没有改善的指标（都能手工数出来）**
- **覆盖**：报告涉及的脚注数 / 全文脚注数；
- **命中**：人工抽检 10–20 条引注，报告「已确认问题」中有多少是你认可的**真问题**（对照你自己的人工核查结果）；
- **误报率**：被判为问题但实际无误的条数 / 被标为问题的总条数；
- **诚实度**：本应标「无法核实」的条目（付费墙、外文、非公开文件）是否真的被标出，而不是被默默当成通过；
- **可定位性**：随机抽 5 条问题，能否靠报告里的引文词句 + 脚注号在 1 分钟内回到 Word 原文位置；
- **稳定性**：第二次运行是否只报变化、且不把上次已解决的问题重复报为「新问题」（重复抖动 = 不适合作为流程依赖）；
- **成本**：单份稿消耗的额度与耗时，能否在「先用短文档」的前提下线性外推到你真实稿件规模。

**采纳门槛建议**：真问题命中高于你自己人工核查的边际收益（即它找到你漏掉的，多于你为处理误报花的时间），且「无法核实」标注可信 → 可升级为常规流程；否则只保留「报告分层 + 重跑比对」这个模式，工具本身不必用。
