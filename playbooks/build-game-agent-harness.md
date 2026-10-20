# 让编码 agent 在游戏原型上先建一个能自动跑的评估回路

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当 agent 在游戏或交互原型上只能靠人眼看效果、改完说不清有没有变好时，怎么把状态和评估变成可复现、可自动跑的回路，让一条短指令驱动上百次迭代。
> 先试这一步：在一条新分支上，用一段 v1 式提示词做出可运行骨架，然后加一个不用人操作也能跑的模拟模式（AI 对战或合成任务回放），先把它的基线数字记下来。
> 最近修订：2026-10-21

## 解决什么问题

游戏和交互原型里大量内容不是代码——资产、布局、场景、数值——这些对 agent 是“不透明”的；训练数据远少于网页项目；也没有标准化工具。与此同时，“这一版是不是更好”往往只能靠人眼看和手感判断，agent 改完没有可回报的信号。

两份材料给的是同一条思路的两半：**把状态变成可复现、可寻址的，把“好不好”变成能自动跑出来的数字或可对比的模拟结果，然后用很短的指令驱动大批迭代。** 一份从架构角度讲（作者认为 LLM 做不好游戏是 context 问题，要用 harness 把游戏“打开黑盒”）；另一份从实操角度给了一串真实提示词、12 个大版本、321 次由编码智能体提交的迭代记录，以及 1200 场 AI vs AI 对战的平衡前后对比。

需要说明：以上都是作者的论证链和个人经验主张，不是评测结论。游戏那篇作者自认有偏见——他是 15 年经验的游戏程序员，对游戏代码更挑剔，对 Svelte 代码则倾向认为 LLM 产出是 good。Battle Drones 那篇是单一作者、单一项目，没有对照实验和盲评，“好玩”仍是主观判断。

## 适用与不适用

**适用**：
- 自研 / 可控引擎的游戏项目，且这些做法**越早越好**——游戏那篇把它当作“写第一行代码前就该设定的目标”级别的架构约束。
- 低风险、可快速试玩、有自动评估入口（AI vs AI 对战、合成任务回放、自动化测试）的浏览器交互原型。
- 有视觉产出、能截图对比的任务（UI 样式微调、布局对齐、某个视觉效果的逼近）。
- 想让非程序员、其他团队成员和 AI agent 在**已有 build 上**迭代的项目。

**不适用或迁移价值有限**：
- 常规软件，尤其网页栈：多数改造（Thing 化、命令回放、独立模拟库）并不必要。游戏那篇认为这几条里只有“截图 diff 定量评估”“外置数据/配置”“减少编译等待”有较直接的迁移价值。
- 已在生产末期的项目：作者明确说代价极高（“VERY hard”），甚至需要临上线时做根本性改动。
- 高风险产品、质量与安全需要人审的代码：Battle Drones 的作者几乎不审代码，且不熟悉 TypeScript，质量和安全风险没有被评估过；这条做法成立的前提是场景本身低风险。
- 图像 diff 只适用于有视觉产出的任务，而且相似度数值本身不等于“做对了”。
- “好玩”这类目标没有客观指标：原文也承认仍靠主观判断，没有受控人类实验。

## 前置条件

- 项目处于起步阶段（或至少在一个新模块/新小项目上试，而不是既有大项目）。
- 引擎提供截图 API 或功能（原文称 most engines have some built in screenshot API or functionality）。
- 一个命令行图像 diff 工具：原文点名免费的 `odiff`，但**没有给出安装或调用方式**，落地前需自行查该工具文档。
- 愿意放弃强 OOP 继承模型（做“Thing 驱动开发”时）。
- 有一定工程投入用于重构引擎与逻辑的边界（做“独立模拟/黑盒”时）。
- 一个放静态数据的外部数据源与反序列化路径（做“数据外置”时）。原文作者用自研的 Depot（正在产品化），也提到其他团队用 Google Sheets 或自建工具。
- **做法 A 额外需要**：可运行、可试玩的浏览器环境；明确的平台约束（如移动端友好）和玩法约束；一个用于生成素材的图像 API key 环境变量（原文提到在 Claude Code for Web 的运行环境里配置 OpenAI API key，但**未给变量名**）；git 分支与可回退的产物；保存 transcript 的位置；足够长的运行窗口和 token 预算。

## 操作步骤

分两条路走。**做法 A 面向低风险原型，时间盒 1–2 天，不需要改引擎架构；做法 B 是长期架构约束。A 的前几步（确定性、截图 diff）本来就是 B 的子集，两者可以叠加，不是互相替代。**

### 做法 A：用可自动跑的模拟回路推进原型（时间盒 1–2 天）

1. **先建安全边界。** 前提：选定一个低风险、能快速运行的原型。做法：开一条 git 分支，限制 API key 权限、设预算上限，并保留每次会话的 transcript。预期结果：任何时候都能回退，事后能复盘“哪条提示词产生了什么变化”。

2. **用一段 MVP 提示词做出可运行骨架，让 agent 反问你需求。** 前提：已明确平台约束。原文 v1 提示词（原样）：

```text
We are going to build a mobile friendly RTS game - command and conquer style - called Battle Drones, in which two armies of drones (both flying and ground-based) battle for territory and resources 

Let's start with a MVP design, ask me some questions
```

预期结果：能跑、能操作、有基础 AI 的第一版；作者自己的判断是 barely a proof of concept、还不好玩——这一版的作用是给后续评估提供载体，不是交付。

3. **给 agent 资产生成能力。** 前提：运行环境里配好图像 API key 的环境变量，并明确要求使用该 API 生成素材。做法：在提示词里点名“用最新的图像生成 API（去查文档），key 在环境变量里”，并让 agent 能查看生成图、自己迭代提示词。预期结果：得到可用的基础 sprites / 模型素材。

4. **加一个“不用人操作也能跑”的模式，作为自动评估入口。** 前提：已有可运行版本。做法：加入 AI vs AI 模式，或等价的合成任务回放。预期结果：不靠人试玩也能产出对局结果，后面的大批模拟以它为跑道。

5. **先跑基线并记下来。** 做法：在跑大改之前记录当前指标（对局时长分布、未决局比例、某种“翻盘/回归”类比例，或非游戏场景的主任务完成率、错误率）。预期结果：后面能给出前后对比，而不是只凭感觉说“更好了”。

6. **用一条短的主观质量指令触发大改，但必须配自动模拟和可回退产物。** 前提：可接受长时间运行和大量 token 消耗；有版本控制。原文 v4 在 Ultracode 模式（动态工作流，一次编排许多子代理）下只给了一句：

```text
This game isn't fun enough yet. Make it a LOT more fun.
```

预期结果：代理跑很多小时、上千次模拟试玩，据此重平衡旧单位、加新单位和功能。非游戏场景把“fun”换成“明显更好用/更清楚/更少错误”，并要求代理跑 N 次模拟、报告前后对比。注意：这句话**不能单独用**，它的配套条件是第 4、5 步的自动跑道和基线。

7. **复杂新机制先让 agent 研究并批评设计，达成一致后再实现。** 原文 v8 的提示词（原样）：

```text
Design a new map. Goal is to make different strategic incentives that encourage use of Infantry and Condors and aerial vehicles. 

To do this the map will have limited harvester resources but several more uplinks - but uplinks will be on islands that are inaccessible by land vehicles or infantry. These uplinks can also not be claimed using air vehicles. The ONLY way to get them is to fly infantry there in a Condor. 

Armies always start with a Condor and a single squad. If an army has no Condor a new one will be provided for free, flying in from the edge closest to their HQ and landing there. That free condor will come with a single free squad on board. 

The two HQs should be entirely separated by water, but still accessible by vehicles thanks to two bridges across the map in different places 

I want to encourage a battle over uplinks. 

The map should be the times the size of other maps - still square 

First research and then critique this design. Only build after we have agreed on any modifications 

You get to design a new biome for this
```

预期结果：先拿到设计批评和修改意见，确认后再实现，避免一次大改跑偏。

8. **让 agent 克隆仓库里已有的可运行样例，而不是从零解释。** 原文做音频多人时，直接让它去看仓库里另一个原型：

```text
Clone Simonw/tools from GitHub and look at recent branches for the example pong game that uses web microphone to implement multiplayer between two phones via audio signals 

Build a version of that for battledrones
```

前提：agent 能访问该仓库和分支。预期结果：它先在已有代码上改，而不是凭空设计协议；原文还先做了测量带宽的 Radio Probe，确认可行才实现完整调制解调器。

9. **让 agent 给自己造工具。** 做法：在提示里要求它先写调试/测量工具，再写功能。原文中 Radio Probe、模型浏览器、Agent vs Agent 调试工具都是这么来的；Agent battles 的做法是让不同 LLM 通过一个插件读取只含战争迷雾内信息的非视觉状态、控制单位，先产出 `AGENT-BATTLES.md` 提案再实现和测试，调试工具还能显示底层提示词响应。预期结果：后续每次迭代都有可观测入口。（原文说明：Agent battles 的完整提示词未给出，只有设计思路。）

10. **在线多人优先选简单无状态方案。** 前提：可接受一个极小的中继服务。原文 WebRTC 在两台自有设备、同 WiFi 下也连不上，于是改为无状态 WebSockets 转发，提示词（原样）：

```text
If I wanted to support multiplayer between two devices at a very low cost without storing any state on the server could I do that with a tiny asyncio web server running on the cheapest Fly instance? 

Build the server and the fly.toml for deploying it, use Fly application name battledrones-relay - put that in a folder in the repo, include deploy instructions in the README in that folder
```

预期结果：一个单 shared-cpu-1x、可缩到零的小服务；作者估算不超过 2.19 美元/月。

11. **每个版本让 agent 自己写 release notes，并保留 transcript。** 预期结果：复盘时可以定位“哪条提示词、哪个版本产生了这个变化”。

### 做法 B：把游戏变成 agent 能直接寻址的东西（写第一行代码前当目标）

原文自称这组做法 very tangible, actionable，并说即使不用 AI，对普通游戏开发也是净收益。

1. **单一随机源（Fixed Randomness）**——唯一一个带种子的随机源，所有非确定性调用（原文举例 `Random.Float` 之类）都走它，而不是在 30 个地方各自调用全局随机。补充：确定性要按“跨浏览器一致”来验收——原文里 Claude 一度必须把 `Math.sin()`、`Math.cos()` 等替换为自定义版本，因为 Chrome 与 Safari 返回值有细微差异，会导致回放不同步。预期结果：第 N 次随机调用的结果每次都一样；回放在目标浏览器上一致。
2. **可截图 + 图层开关（Screenshot-ability）**——接截图能力；再加 UI 层 / gameplay 层等独立开关，只保留当前要处理的那一层。
3. **用图像 diff 做定量评估**——用 `odiff` 对两张图求差，输出 diff 图和量化的相似度数值（原文举例形如“85% similar”），把 diff 图和数值一起交给 agent，要求它每轮报告该数值并朝“降低差异”迭代。为什么不直接把整张截图丢给多模态模型：原文说这会带来 **context pollution**——模型会同时处理你没想让它改的所有区域（他用“会议官网首页 + 把骨架改成海盗”的标注例子说明，未被请求的绿色区域全是噪声）。所以要先 diff、再裁剪。原文未给 `odiff` 的安装或调用命令。
4. **确定性状态：一开始就做 save/load**——不要把它拖到最后当成一个 feature，而是从最初就与核心架构一起设计，并做到能精确保存和加载任意状态。这是后面所有可复现、可评估的前提。
5. **Thing 驱动开发（fat struct / 单一对象类型）**——前提：愿意放弃强 OOP 继承模型。做法：假设游戏里所有东西本质上是同一种东西，代码里就用单一类型（原文建议直接叫 `Thing`），每个 `Thing` 带一组 stat 类数值、一个 `isAlive` 之类的共用标记、以及一个 `type` 枚举，具体行为由实现代码按 `type` 分派。原文给的收益：对象模型只有一个真相来源，AI 不需要理解 100 个类和它们的继承关系（那会塞满 context，并让它纠结“该继承？该改类型？该新建类？”）；序列化/反序列化只有一个入口一个出口，避免 polymorphic deserialization 和继承树带来的奇怪反序列化竞态。原文说这并不像想象中那么费内存，并推荐 Wookash podcast 中与 Dreams 创作者的对谈。原文未给实际代码。
6. **可寻址状态：命令模式（Command Pattern）**——前提：已采用第 5 步的单一对象类型。做法：状态变更不写成松散函数调用，而是表示为（理想情况下可序列化的）命令对象，统一经过一个处理类应用到对象上；复现 bug 时从起始状态“回放”序列化命令。关键延伸：命令**不必由游戏本身产生**，可以在文本编辑器里手写（或由 AI 生成）后直接回放到运行中的实例上，**无需编译**。目的：给 AI 和你一个带类型的游戏交互界面，把游戏变成 puppet-able；同时减少编译等待。原文的一般性原则是：能让游戏不编译就产生变化的能力越强越好。
7. **数据外置（Data Management）**——把描述“东西本来是什么样”的静态运营数据（原文举例 `Type`、`attackDamage`、`walkSpeed`、`boatSpeed`）放在游戏外部的数据源里，启动时反序列化并套用到对应对象上；改数值 = 改数据源，不再重编译、不再写 console 命令之类绑定。工具：作者用自研 Depot（正产品化），也提到其他团队用 Google Sheets 或自建工具。预期结果：非程序员、其他团队成员和 AI agent 都能在**已有 build 上**迭代，甚至不需要编辑器权限（作者在 Cantata 项目里是约 7 名非程序员拿 build + Depot 迭代）。
8. **独立模拟 / 黑盒（Standalone Simulation / Blackbox）**——前提：愿意做工程投入、重构引擎与逻辑的边界。做法：把模拟逻辑从引擎的操作逻辑中抽出来，物理上作为独立 DLL/library；引擎与模拟之间通过第 6 步的“命令”通信，模拟返回更新后的状态，引擎对比前后状态做 diff 来理解发生了什么，并“Dumb”地照做。原文例子：移动请求发给模拟，模拟判断目标是否合法并结算，返回“该对象已移动”的状态对象；引擎 diff 前后状态后播放动画、模型、音效。收益：任何来源（网络、LLM、其他）都能向核心发命令，网络编程因此简单得多。

**怎么选**：时间预算 1–2 天、或面对既有项目 / 新模块 / 低风险原型 → 做法 A；新项目、自研可控引擎、愿意为长期的 agent 循环付架构代价 → 做法 B。最实用的组合是 B 的前几步（确定性 + 截图 diff + save/load）打底，再用 A 的短指令 + 自动模拟回路来推进。

## 怎么判断变好了

- **可复现率（硬门槛）**：同一份种子 / 同一串命令回放，能否 100% 复现同一状态；跨浏览器回放是否一致。这一条不达标，后面所有指标都不可信。
- **图像 diff 的相似度数值**：原文举例形如“85% similar”，可作为每个 agent turn 的稳定评估值，要求 agent 每轮报告并朝“降低差异 / 提高相似度”迭代。
- **自动模拟的前后对比**：Battle Drones 用 1200 场 Normal 难度 AI vs AI 对战对比，25 分钟后仍未决的对局从 14% 降到 0.9%；曾落后 800+ scrap 的一方获胜比例从 24% 升到 46%。这是材料里唯一一组带数字的前后对比，可作为“用模拟回路验证改动”的范式：先定一个能从模拟里量出来的指标，再让代理大批跑并报告前后值。
- **达成目视效果所需的人工介入次数与 agent 轮数**，与不使用该 harness 的基线对比。（游戏那篇这一句在材料中截断，未给出完整对照方式，落地时需自行定义基线。）
- **成本与回归**：token 与时长成本、关键回归是否出现（原文未给阈值，需自己设上限）。
- **主观质量**：两名以上人工盲评偏好；原文承认“好玩”仍靠主观判断，没有受控人类实验。
- 游戏那篇还把“任何改动都做到最小必要变更”作为一个可被近乎隔离评估的目标，避免积累 spaghetti 式技术债。

**最小试用方式**：在一个新模块或新小项目上，用 1–2 天做做法 A 的前 6 步——可运行骨架 + 自动模拟入口 + 基线 + 一条短主观指令；先只做“确定性 + 能自动跑”，不要全面重构。

**试多久**：原文建议的最小试用是 1–2 天；Battle Drones 的实际规模是 12 个大版本、321 次代理提交，可作为“跑顺之后”的参照。同时游戏那篇强调这些是“越早越好”的架构约束（生产末期再补代价极高），验证窗口本身也应放在项目早期。

## 常见坑

- **短主观指令被当成唯一方法**：“Make it a LOT more fun”之所以有效，是因为前面有可运行版本、自动模拟跑道、基线记录和可回退分支。缺任何一条，它就只是一句许愿。
- **别直接把整张截图丢给多模态模型**：会带来 context pollution，模型会同时处理你不想让它改的区域。应先 diff、再裁剪。
- **相似度数值不等于“做对了”**：图像 diff 只适用于有视觉产出的任务。
- **跨浏览器确定性**：`Math.sin()` / `Math.cos()` 之类的返回值在 Chrome 与 Safari 有细微差异，会直接让回放不同步；把“确定性”写成验收条件，并在目标浏览器上跑回放对比。
- **别默认 WebRTC 能连上**：原文在两台自有设备、同 WiFi 下也没连上，退到无状态 WebSockets 中继才跑通。
- **原文没有可复制的东西（游戏那篇）**：全篇没有命令、配置或提示词；`odiff` 只被点名，没有安装或调用方式。落地前必须自行查该工具文档。
- **别在生产末期补这些约束**：作者明确说 VERY hard，甚至需要临上线做根本性改动。
- **别把整套改造搬到普通软件上**：Thing 化、命令回放、独立模拟库对网页栈等常规软件并不必要。
- **把“主动推进”当成有依据的做法**：原文只覆盖单次任务内的自主多轮迭代（agent 先做多轮内循环，再回到截图比对/diff，直到指标提升），以及长时间运行的多子代理批量迭代。材料里由外部状态触发的例子只有轶事性的两条：发现每周 token 额度只剩 75% 且 45 分钟后重置，就限时让代理去做随机地图；音频多人让试玩者头痛，就加警告并转做在线多人。**没有给出任何定时器、事件触发器或调度配置**。
- **别忽略作者各自的自认偏差**：游戏那篇作者是 15 年游戏程序员，对游戏代码更挑剔、对网页栈更宽容，“游戏训练数据比网页少若干个数量级”用了 I imagine；Battle Drones 是单一作者、单一项目，作者几乎不审代码且不熟悉 TypeScript，音频多人刚跑通未充分测试，1200 场模拟的方法与统计细节未展开，Agent battles 的完整提示词也未给出。

## 证据与来源

**材料里给出的案例与数据**：
- mood.site：游戏那篇作者早前用 ChatGPT 网页界面手动复制粘贴代码建成；称若没有 LLM，可能要到现在还在做第一版；实际耗时约“2–3 周的晚上，总共约 20 小时”。
- Cantata：团队中约 7 名非程序员拿游戏 build + 自研数据编辑器 Depot 迭代，无需作者重新出包。
- `odiff`：被称为 very good free, command-line image-diffing tool，能输出 diff 图像和“85% similar”式的量化差异值（无安装/调用方式）。
- Battle Drones：12 个大版本、321 次由编码智能体提交；模型从 Claude Fable 5 到 Opus 5.5；v4 在一次 Ultracode 动态工作流里跑了很多小时、超过一千次模拟试玩。
- 1200 场 Normal 难度 AI vs AI 对战：25 分钟后未决局 14% → 0.9%；落后 800+ scrap 的一方获胜比例 24% → 46%。
- WebSocket 中继：部署在 Fly.io 单 shared-cpu-1x、可缩到零，作者估算不超过 2.19 美元/月；WebRTC 在两台自有设备同 WiFi 下也连不上。
- 音频多人：已在 laptops、iPhones、iPads 上试过；高频调制解调器声音让试玩者头痛，作者加警告后改做在线多人。

**只是作者主张、无数据支撑的部分**：
- “LLM 在网页栈上几乎无所不能”“LLM 在游戏上失败”——个人经验与主观判断；“游戏训练数据比网页少若干个数量级”是推测（用了 I imagine）。
- “AI REALLY likes this”（单一对象类型）、“截图会污染模型对进展的判断”——主张 + 一个图解示例，没有对照实验；对强 OOP 模型、多态反序列化的批评是经验之谈。
- Battle Drones “actually fun”、效果 spectacular、Opus 5.5 的 3D 建模很强、工具几乎免费、音频多人是 RTS 首例（as far as I can tell）——均为主张。

**适用条件与局限**：
- 架构类做法面向自研 / 可控引擎的游戏项目，且需要在起步阶段采纳；对常规软件（尤其网页栈）多数改造并不必要。
- 原型迭代类做法成立的前提是低风险场景、可自动模拟或回放的评估入口、可回退分支与预算控制。
- 两份材料都没有给出完整的可复制工程（游戏那篇无命令、配置、提示词；Battle Drones 那篇没给变量名、没给 Agent battles 完整提示词，也没有对照实验、盲评或安全评估）。

**与已有概念/工具的关系**：
- Claude Code：两篇都把它当作“你很可能正在用的那种 harness”举例。Battle Drones 补充了 Claude Code for Web、Ultracode 动态工作流、长时间运行、多子代理、代理自建工具和模拟评估的用法；游戏那篇讨论的是在这个工具之上，再为特定产出物（游戏）定制 harness。
- Context engineering：游戏那篇高度呼应这个概念——解释了 system / assistant / user prompt 三段结构、会话历史每次都被重新提交，以及 context pollution、context rot 的退化场景，并明确把“让 LLM 做好游戏”定义为 context 问题。本手册可以看作该概念在一个特定领域（游戏/交互原型）的具体化：先用确定性与 diff 减少喂给模型的噪声，再用自动模拟把“好不好”变成可回报的信号。

## 依据的调研

- [How to engineer an AI harness for game development](../research/radar/2026-10-14/3016-how-to-engineer-an-ai-harness-for-game-development.md)：值得一试，建议小范围试：在新项目或新模块的第一天就采用“单一随机源 + 可保存/加载的确定性状态 + 截图 diff 定量评估”这三件事，把产出物改造成 agent 可直接寻址的命令/数据接口；因为原文给出的是一组相当具体的工程约束（而非泛泛观点），能明显缩短 agent 的验证回路，但全部是作者自述经验、没有基准数据，也没有可直接复制的命令或配置，需自行落地。
- [Battle Drones - a vibe coded RTS with audio-based multiplayer](../research/radar/2026-10-21/5456-battle-drones-a-vibe-coded-rts-with-audio-based-mu.md)：值得一试，建议小范围试：把文中“编码智能体 + 可自动模拟的评估回路 + 短主观质量指令”用于低风险交互原型，先建基线再让代理跑大批模拟并重平衡；理由是作者用 12 轮迭代、321 次代理提交和 1200 场 AI 对战给出了可操作提示词与量化前后对比，但仍是单一游戏案例、缺乏独立验证。
